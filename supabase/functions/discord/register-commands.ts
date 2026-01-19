// Script to register Discord slash commands
// Run with: deno run --allow-net register-commands.ts

// Discord API constants
const COMMAND_TYPE = {
  CHAT_INPUT: 1,
} as const

const OPTION_TYPE = {
  STRING: 3,
} as const

// Environment setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")
const APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID")

if (!DISCORD_TOKEN || !APPLICATION_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID environment variables")
  Deno.exit(1)
}

// Command option builder helpers
const createStringOption = (name: string, description: string, required = false) => ({
  name,
  description,
  type: OPTION_TYPE.STRING,
  required,
})

// Define your slash commands here
const commands = [
  {
    name: "nova-divize",
    description: "Vytvoř novou divizi (tým)",
    type: COMMAND_TYPE.CHAT_INPUT,
    options: [
      createStringOption("nazev", "Název nové divize (např. 'hospoda')", true),
      createStringOption("garant-barva", "Barva role garanta (hex kód, např. '#FF5733')"),
      createStringOption("člen-barva", "Barva role člena (hex kód, např. '#33FF57')"),
      createStringOption("onboarding-nadpis", "Nadpis pro onboarding"),
      createStringOption("onboarding-text", "Popisný text pro onboarding"),
      createStringOption("onboarding-emoji", "Emoji pro onboarding (např. '🎉')"),
    ],
  },
]

async function registerCommands(scope: "global" | { guild: string }) {
  const isGlobal = scope === "global"
  const url = isGlobal
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${scope.guild}/commands`

  const scopeLabel = isGlobal ? "global" : `guild ${scope.guild}`
  console.log(`Registering ${commands.length} commands for ${scopeLabel}...`)

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${DISCORD_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Failed to register commands:", error)
    Deno.exit(1)
  }

  const registered = await response.json()
  console.log(`Successfully registered commands for ${scopeLabel}:`)
  registered.forEach((cmd: any) => {
    console.log(`  - /${cmd.name}`)
  })
}

// Main execution
const guildId = Deno.args[0]
const scope = guildId ? { guild: guildId } : "global"

await registerCommands(scope)
