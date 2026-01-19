# Discord Infrastructure as Code

Manage your entire Discord server (Helmáč) as declarative Terraform configuration. Add, modify, or remove divisions, channels, roles, and permissions through code—everything syncs automatically to Discord.

## Quick Start

**To configure new divisions or teams:** Simply edit [divisions.tf](divisions.tf) and open a pull request. The rest is automated.

All channels, roles, permissions, and onboarding flows are generated automatically from the division definitions.

## How It Works

This project uses Terraform to manage:

- **Shared channels** with full permission setup
- **Individual division channels** (teams) with dedicated channels, roles, and permissions
- **Automated onboarding** for new members to self-select divisions
- **Role hierarchy** with member and manager roles per division
- **Channel permissions** configured declaratively
- **CI/CD pipeline** with encrypted state management

### Architecture

```plain
divisions.tf (single source of truth)
    ↓
    ├─→ channels.tf    - Creates text channels + permissions
    ├─→ roles.tf       - Creates member & manager roles
    └─→ onboarding.tf  - Generates self-service onboarding
```

## Setup

Do only if you need to replicate the behavior outside of our Discord server, or if you need to apply changes from local machine (discouraged).

### Prerequisites

1. **Discord Bot with Admin permissions**
   - Create at [Discord Developer Portal](https://discord.com/developers/applications)
   - Copy bot token and server ID (enable Developer Mode in Discord)

2. **Terraform 1.0+**

### Installation

```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env with your DISCORD_BOT_TOKEN and DISCORD_SERVER_ID
source .env

# 2. Install Discord provider
./scripts/setup.sh

# 3. Initialize Terraform
terraform init
```

## Usage

### Adding a New Division

Edit [divisions.tf](divisions.tf) and add to the `locals.divize` list:

```hcl
{
  name  = "new-team"
  color = {
    clen   = 2067276  # Member role color (terraform is unable to handle HEX colors, use DEC instead)
    garant = 3066993  # Manager role color
  }
  onboarding = {
    description = "Help with new team tasks"
    emoji_name  = "🆕"
    title       = "New Team"
  }
}
```

This automatically creates:

- Text channel `#new-team`
- Role `Člen - new-team` (Member)
- Role `Garant - new-team` (Manager)
- Channel permissions for both roles
- Onboarding prompt for self-assignment

### Deploy Changes

```bash
# Preview changes
terraform plan

# Apply to Discord
terraform apply
```

### Import Existing Resources

Helper scripts are provided for importing existing Discord infrastructure:

```bash
# Import division roles
./scripts/import-division.sh garant hospoda ROLE_ID

# Import channel permissions
./scripts/import-channel-permission.sh info INFO_ID

# Import division channel permissions
./scripts/import-division-channel-permission.sh
```

## CI/CD

GitHub Actions automatically:

1. Decrypts Terraform state (GPG encrypted)
2. Builds Discord provider from source
3. Plans changes on every push to main
4. Re-encrypts and stores state

**Required secrets:**

- `DISCORD_BOT_TOKEN`
- `DISCORD_SERVER_ID`
- `ENCRYPTION_KEY` (GPG passphrase)

## Project Structure

| File                             | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| [divisions.tf](divisions.tf)     | **Division definitions** (edit this to add/modify teams) |
| [channels.tf](channels.tf)       | Channel creation and permission overrides                |
| [roles.tf](roles.tf)             | Role definitions (global + division roles)               |
| [permissions.tf](permissions.tf) | Reusable permission datasets                             |
| [onboarding.tf](onboarding.tf)   | Server onboarding flow configuration                     |
| [server.tf](server.tf)           | Main server resource                                     |
| [provider.tf](provider.tf)       | Discord provider authentication                          |
| [variables.tf](variables.tf)     | Input variable definitions                               |
| [versions.tf](versions.tf)       | Terraform and provider version constraints               |

## Important Notes

- **Never commit** `.env`, `terraform.tfvars`, or `terraform.tfstate` (contains sensitive data)
- **Test first** - Always run `terraform plan` before `terraform apply`
- **Encrypted state** - CI/CD uses GPG-encrypted state for security
- **Provider source** - Built from [tumido/terraform-provider-discord](https://github.com/tumido/terraform-provider-discord) (branch: my-release)
