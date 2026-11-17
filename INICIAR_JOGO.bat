@echo off
rem Inicia um servidor local e abre o jogo no navegador.
rem (Com servidor, os sprites e a foto do Safepoint aparecem dentro do 3D.)
cd /d "%~dp0"
set PORTA=8080
start "" "http://localhost:%PORTA%/index.html"
where python >nul 2>nul
if %errorlevel%==0 (
  echo Servidor em http://localhost:%PORTA%  (feche esta janela para parar)
  python -m http.server %PORTA%
  goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
  npx --yes serve -l %PORTA% .
  goto :eof
)
echo Nao encontrei Python nem Node.js. Instale um deles ou abra o index.html direto.
pause
