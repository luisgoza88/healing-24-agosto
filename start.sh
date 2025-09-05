#!/bin/bash

# Script para iniciar la aplicación Healing Forest

echo "🌲 Iniciando Healing Forest..."

# Cargar variables de entorno
source .env

# Exportar variables
export EXPO_PUBLIC_SUPABASE_URL
export EXPO_PUBLIC_SUPABASE_ANON_KEY
export SUPABASE_SERVICE_ROLE_KEY
export EXPO_PUBLIC_PAYU_MERCHANT_ID
export EXPO_PUBLIC_PAYU_ACCOUNT_ID
export EXPO_PUBLIC_PAYU_API_KEY
export EXPO_PUBLIC_PAYU_API_LOGIN
export EXPO_PUBLIC_PAYU_PUBLIC_KEY
export EXPO_PUBLIC_PAYU_TEST
export EXPO_PUBLIC_API_URL

# Limpiar cache si se especifica
if [ "$1" = "--clear" ]; then
    echo "🧹 Limpiando cache..."
    npx expo start --clear
else
    npx expo start
fi