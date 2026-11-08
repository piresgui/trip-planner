@echo off
title Trip Planner
cd /d "%~dp0frontend"
if not exist node_modules call npm install
echo Trip Planner rodando em http://localhost:5173 - feche esta janela para encerrar.
start "" http://localhost:5173
call npx vite --port 5173 --strictPort
