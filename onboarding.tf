resource "discord_server_onboarding" "helmac" {
  default_channel_ids = [
    discord_text_channel.discord-help.id,
    discord_forum_channel.uredni-deska.id,
    discord_news_channel.dulezite.id,
    discord_forum_channel.napady.id,
    discord_text_channel.info.id,
    discord_text_channel.stoka.id,
    discord_text_channel.spolecny-chat.id,
    discord_voice_channel.proste-voice-chat.id,
  ]
  enabled   = true
  mode      = 0
  server_id = discord_server.helmac.id

  prompt {
    in_onboarding = true
    required      = false
    single_select = false
    title         = "Vítej! Máš zájem podílet se na práci v rámci nějaké konkrétní sekce? Není to povinné"
    type          = 1

    dynamic "option" {
      for_each = [for div in local.divize : div if can(div.onboarding)]
      content {
        channel_ids    = []
        description    = option.value.onboarding.description
        emoji_animated = false
        emoji_name     = option.value.onboarding.emoji_name
        role_ids = [
          discord_role.divize_clen[option.value.name].id
        ]
        title = option.value.onboarding.title
      }
    }
  }
  prompt {
    in_onboarding = true
    required      = false
    single_select = true
    title         = "Chceš mít přístup ke všem sekcím jako pozorovatel?"
    type          = 0

    option {
      channel_ids    = []
      description    = "Prostě chci sledovat, co se ve všech sekcích děje, ale nechci se aktivně účastnit"
      emoji_animated = false

      emoji_name = "🤷"
      role_ids = [
        discord_role.cumil.id,
      ]
      title = "Chci vidět všecho"
    }
    option {
      channel_ids = [
        discord_text_channel.info.id,
      ]
      description    = "Chci mít přístup jen k tomu, co jsem zvolil v předchozí otázce."
      emoji_animated = false

      emoji_name = "🙈"
      role_ids   = []
      title      = "Ani ne"
    }
  }
}
