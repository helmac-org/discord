#!/bin/bash

REPO="helmac-org/discord"
LATEST_ARTIFACT_URI=$(gh api repos/$REPO/actions/artifacts -q '.artifacts | map(select(.name=="Encrypted Terraform State")) | max_by(.updated_at) | .archive_download_url')

echo "Downloading state from: $LATEST_ARTIFACT_URI"
gh api $LATEST_ARTIFACT_URI > terraform.tfstate.encrypted.zip
unzip -o terraform.tfstate.encrypted.zip

rm terraform.tfstate.encrypted.zip terraform.tfstate
gpg --batch --decrypt --passphrase=$ENCRYPTION_KEY --output terraform.tfstate terraform.tfstate.encrypted
