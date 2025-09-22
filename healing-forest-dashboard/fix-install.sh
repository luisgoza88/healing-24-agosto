#!/bin/bash

# Script para limpiar y reinstalar el proyecto

echo "🧹 Limpiando archivos anteriores..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .next
rm -rf .swc

echo "📦 Instalando dependencias..."
npm install

echo "✅ Instalación completada"
echo "🚀 Ahora puedes ejecutar: npm run dev"