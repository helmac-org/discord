terraform {
  required_version = ">= 1.0"

  required_providers {
    discord = {
      source  = "local/tumido/discord"
      version = "~> 1.0.0"
    }
  }
}
