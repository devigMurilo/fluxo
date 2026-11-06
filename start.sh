#!/usr/bin/env bash
# Script para iniciar o ecossistema Fluxo (Backend e Frontend)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================="
echo "   🚀 INICIANDO O FLUXO (MVP v1.0)"
echo "========================================="

echo "1. Iniciando Backend Django na porta 8000..."
cd "$DIR/backend"
./venv/bin/python manage.py migrate
./venv/bin/python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

echo "Backend rodando com PID $BACKEND_PID."
echo "2. Iniciando Expo Frontend..."
cd "$DIR/frontend"
npx expo start

# Encerra o backend ao fechar o script
kill $BACKEND_PID
