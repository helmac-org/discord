// Discord Interactions Endpoint for Supabase Edge Functions
// This function handles Discord slash commands and interactions

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
} from "npm:discord-interactions@3.4.0"
import { Octokit } from "npm:@octokit/rest@21.0.2"

// Helper function to create JSON responses for Discord
function jsonResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } }
  )
}

// Helper function to create HTTP error responses with logging
function httpError(message: string, status: number, logMessage?: string): Response {
  console.error(logMessage || message)
  return new Response(message, { status })
}

// Helper function to create ephemeral error response
function errorResponse(message: string) {
  return jsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: message,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  })
}

// Helper function to create deferred response
function deferredResponse() {
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  })
}

// Helper function to convert hex color to decimal
function hexColorToDecimal(hexColor: string): number | null {
  // Remove # if present
  const hex = hexColor.replace(/^#/, '')

  // Validate hex format (should be 6 characters)
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null
  }

  return parseInt(hex, 16)
}

// Helper to add color to data object if valid
function addColorIfValid(data: any, key: string, hexColor: string | undefined, fieldName: string) {
  if (hexColor) {
    const decimalColor = hexColorToDecimal(hexColor)
    if (decimalColor !== null) {
      data[key] = decimalColor
      return
    } else {
      console.warn(`Invalid hex color for ${fieldName}: ${hexColor}, using 0`)
    }
  }
  data[key] = 0
}

// Trigger GitHub workflow via repository_dispatch
async function triggerGitHubWorkflow(interaction: any, command: string, data?: any) {
  const githubToken = Deno.env.get("GITHUB_TOKEN")
  const githubRepo = Deno.env.get("GITHUB_REPO") // Format: "owner/repo"
  const discordAppId = Deno.env.get("DISCORD_APPLICATION_ID")

  if (!githubToken || !githubRepo || !discordAppId) {
    console.error("Missing GitHub configuration")
    await sendFollowupMessage(
      discordAppId,
      interaction.token,
      "❌ Chyba konfigurace serveru. Kontaktujte administrátora."
    )
    return
  }

  // Parse owner and repo from GITHUB_REPO
  const [owner, repo] = githubRepo.split("/")
  if (!owner || !repo) {
    console.error("Invalid GITHUB_REPO format. Expected 'owner/repo'")
    await sendFollowupMessage(
      discordAppId,
      interaction.token,
      "❌ Chyba konfigurace serveru. Kontaktujte administrátora."
    )
    return
  }

  // Initialize Octokit with authentication
  const octokit = new Octokit({ auth: githubToken })

  // Helper to fetch workflow runs
  const fetchWorkflowRuns = async () => {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      event: "repository_dispatch",
      per_page: 5,
    })
    return data.workflow_runs || []
  }

  try {
    // Get existing workflow runs before triggering
    const existingRuns = await fetchWorkflowRuns()
    const existingRunIds = new Set(existingRuns.map(run => run.id))

    // Create repository dispatch event
    await octokit.repos.createDispatchEvent({
      owner,
      repo,
      event_type: "discord-command",
      client_payload: {
        command: command,
        interaction_token: interaction.token,
        application_id: discordAppId,
        user: interaction.member?.user?.username || "unknown",
        user_id: interaction.member?.user?.id,
        channel_id: interaction.channel_id,
        guild_id: interaction.guild_id,
        data: data || {},
      },
    })

    // Poll for new workflow run (max 10 attempts, 1 second apart)
    let workflowUrl = `https://github.com/${githubRepo}/actions`
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const runs = await fetchWorkflowRuns()
      const newRun = runs.find(run => !existingRunIds.has(run.id))

      if (newRun) {
        workflowUrl = newRun.html_url
        console.log(`Workflow triggered: ${workflowUrl}`)
        break
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      console.warn(`Could not find new workflow run after ${maxAttempts} attempts, using fallback URL`)
    }

    // Send immediate follow-up message with workflow link
    await sendFollowupMessage(
      discordAppId,
      interaction.token,
      `⏳ Spuštěno. Průběh můžete sledovat zde: <${workflowUrl}>`
    )

    console.log(`Successfully triggered GitHub workflow for command: ${command}, URL: ${workflowUrl}`)
  } catch (error) {
    console.error("Failed to trigger GitHub workflow:", error)
    await sendFollowupMessage(
      discordAppId,
      interaction.token,
      "❌ Nepodařilo se spustit workflow. Zkontrolujte logy."
    )
  }
}

// Helper to send follow-up messages to Discord
async function sendFollowupMessage(appId: string, token: string, content: string) {
  try {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  } catch (error) {
    console.error("Failed to send follow-up message:", error)
  }
}

console.log("Discord Interactions Handler Started")

Deno.serve(async (req) => {
  // Get Discord signature headers
  const signature = req.headers.get("X-Signature-Ed25519")
  const timestamp = req.headers.get("X-Signature-Timestamp")
  const body = await req.text()

  // Get public key from environment
  const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY")

  if (!publicKey) {
    return httpError("Server configuration error", 500, "DISCORD_PUBLIC_KEY environment variable not set")
  }

  // Verify the request signature using discord-interactions library
  if (!signature || !timestamp) {
    return httpError("Invalid request signature", 401, "Missing signature headers")
  }

  const isValid = verifyKey(body, signature, timestamp, publicKey)

  if (!isValid) {
    return httpError("Invalid request signature", 401, "Invalid signature")
  }

  // Parse the interaction
  let interaction
  try {
    interaction = JSON.parse(body)
  } catch (error) {
    return httpError("Invalid request body", 400, `Failed to parse interaction body: ${error}`)
  }

  // Handle Discord PING (required for endpoint verification)
  if (interaction.type === InteractionType.PING) {
    console.log("Responding to PING")
    return jsonResponse({ type: InteractionResponseType.PONG })
  }

  // Handle application commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    try {
      const commandName = interaction.data.name
      console.log(`Received command: ${commandName}`)

      // Handle different commands
      switch (commandName) {
        case "nova-divize": {
          // Extract command options
          const options = interaction.data.options || []
          const nazev = options.find((opt: any) => opt.name === "nazev")?.value
          const garantBarva = options.find((opt: any) => opt.name === "garant-barva")?.value
          const clenBarva = options.find((opt: any) => opt.name === "člen-barva")?.value
          const onboardingNadpis = options.find((opt: any) => opt.name === "onboarding-nadpis")?.value
          const onboardingText = options.find((opt: any) => opt.name === "onboarding-text")?.value
          const onboardingEmoji = options.find((opt: any) => opt.name === "onboarding-emoji")?.value

          if (!nazev) {
            return errorResponse("❌ Chybí povinný parametr: název")
          }

          // Build data object with only provided optional parameters
          const data: any = { nazev }

          // Add optional parameters if provided
          addColorIfValid(data, "garantBarva", garantBarva, "garant-barva")
          addColorIfValid(data, "clenBarva", clenBarva, "člen-barva")
          if (onboardingNadpis) data.onboardingNadpis = onboardingNadpis
          if (onboardingText) data.onboardingText = onboardingText
          if (onboardingEmoji) data.onboardingEmoji = onboardingEmoji

          // Trigger GitHub workflow in background
          const discordAppId = Deno.env.get("DISCORD_APPLICATION_ID")
          triggerGitHubWorkflow(interaction, commandName, data).catch(async (error) => {
            console.error("Failed to trigger GitHub workflow:", error)
            // Notify user of the failure
            if (discordAppId) {
              await sendFollowupMessage(
                discordAppId,
                interaction.token,
                "❌ Nepodařilo se spustit workflow. Zkontrolujte konfiguraci serveru."
              )
            }
          })

          return deferredResponse()
        }

        default:
          return errorResponse(`❌ Neznámý příkaz: ${commandName}`)
      }
    } catch (error) {
      console.error("Error handling command:", error)
      return errorResponse("❌ Došlo k chybě při zpracování příkazu.")
    }
  }

  // Unknown interaction type
  return httpError("Unknown interaction type", 400, `Unknown interaction type: ${interaction.type}`)
})

/* Setup Instructions:

1. Set the DISCORD_PUBLIC_KEY secret:
   supabase secrets set DISCORD_PUBLIC_KEY=your_public_key_here

2. Deploy the function:
   supabase functions deploy discord

3. Get the function URL:
   https://<project-ref>.supabase.co/functions/v1/discord

4. Set this URL as your Interactions Endpoint URL in Discord Developer Portal

5. Test locally:
   supabase functions serve discord --env-file ./supabase/.env.local

*/
