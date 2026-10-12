@echo off
cd /d "%~dp0frontend"
if not exist .env copy .env.example .env
if not exist node_modules call npm install
npm run dev
