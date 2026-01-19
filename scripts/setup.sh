#!/bin/bash
set -e

PROVIDER_REPO="https://github.com/tumido/terraform-provider-discord.git"
PROVIDER_REF="my-release"
PROVIDER_VERSION="1.0.0"
OS_ARCH="$(go env GOOS)_$(go env GOARCH)"
PLUGINS_DIR="$HOME/.terraform.d/plugins/local/tumido/discord/$PROVIDER_VERSION/$OS_ARCH"

echo "Building provider from forked GitHub repo..."
rm -rf /tmp/terraform-provider-discord
git clone --branch $PROVIDER_REF --depth 1 $PROVIDER_REPO /tmp/terraform-provider-discord
cd /tmp/terraform-provider-discord

# Build the provider
go build -o terraform-provider-discord

# Install to Terraform plugins directory
mkdir -p "$PLUGINS_DIR"
cp terraform-provider-discord "$PLUGINS_DIR/"
chmod +x "$PLUGINS_DIR/terraform-provider-discord"

echo "✓ Provider installed to $PLUGINS_DIR"
cd -
rm -rf /tmp/terraform-provider-discord
