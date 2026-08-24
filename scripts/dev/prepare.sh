#!/bin/sh

set -eu

API_ACCESS_TOKEN=$(openssl rand --hex 32)
NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG="disabled"
REVALIDATION_WEBHOOK_SECRET=$(openssl rand --hex 32)
TYPESENSE_ADMIN_API_KEY=$(openssl rand --hex 32)

set_env_value() {
	KEY=$1
	VALUE=$2
	FILE=$3

	sed -i -E "s|^${KEY}=.*$|${KEY}=\"${VALUE}\"|" "$FILE"
}

ENV_FILE=./docker/.env

if [ ! -f "$ENV_FILE" ]; then
	cp $ENV_FILE.example $ENV_FILE

	set_env_value TYPESENSE_ADMIN_API_KEY "$TYPESENSE_ADMIN_API_KEY" "$ENV_FILE"
fi

ENV_FILE=./.env.local

if [ ! -f "$ENV_FILE" ]; then
	cp $ENV_FILE.example $ENV_FILE

	set_env_value API_ACCESS_TOKEN "$API_ACCESS_TOKEN" "$ENV_FILE"
	set_env_value NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG "$NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG" "$ENV_FILE"
	set_env_value REVALIDATION_WEBHOOK_SECRET "$REVALIDATION_WEBHOOK_SECRET" "$ENV_FILE"
	set_env_value TYPESENSE_ADMIN_API_KEY "$TYPESENSE_ADMIN_API_KEY" "$ENV_FILE"
fi

echo "✓ Environment variables initialized."
