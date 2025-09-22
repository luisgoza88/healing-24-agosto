#!/bin/bash

echo "📦 Instalando dependencias para el Dashboard..."

# Dependencias para gráficos y visualización
npm install recharts date-fns

# Dependencias para componentes UI modernos
npm install @radix-ui/react-slot @radix-ui/react-tooltip
npm install lucide-react
npm install clsx tailwind-merge

# Dependencias para animaciones
npm install framer-motion

echo "✅ Dependencias instaladas!"