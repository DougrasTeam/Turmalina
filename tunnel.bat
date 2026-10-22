@echo off
cls
echo ====================================================
echo   INICIALIZADOR DO CLOUDFLARE TUNNEL + QR CODE
echo ====================================================
echo.
echo [1/2] Iniciando o tunel Cloudflare na porta 4096...
echo.

:: Deleta arquivo temporario antigo se existir
if exist "%temp%\tunnel_url.txt" del "%temp%\tunnel_url.txt"

:: Inicia o túnel salvando a saída JSON em segundo plano
start /b npx cloudflared tunnel --url http://localhost:4096 --http-host-header "localhost:4096" --output json > "%temp%\tunnel_log.json" 2>&1

echo [2/2] Aguardando a geracao do link...
:loop
timeout /t 1 > nul
if not exist "%temp%\tunnel_log.json" goto loop

:: Captura a URL limpa de dentro do arquivo JSON usando comandos nativos do CMD
for /f "tokens=4 delims==" %%i in ('findstr /i "trycloudflare.com" "%temp%\tunnel_log.json"') do (
    set "URL=%%~i"
)

:: Se ainda nao pegou no log bruto, tenta ler a string direta
for /f "tokens=2 delims= " %%a in ('findstr /i "https://" "%temp%\tunnel_log.json"') do (
    echo %%a | findstr "trycloudflare.com" > nul && set "URL=%%a"
)

:: Caso demore um pouco para registrar na rede
if "%URL%"=="" goto loop

:: Limpa strings indesejadas e exibe o resultado
cls
echo ====================================================
echo   TUNEL ATIVADO COM SUCESSO!
echo ====================================================
echo.
echo  Link publico: %URL%
echo.
echo Escaneie o QR Code abaixo com o celular para acessar:
echo.

:: Gera o QR Code na tela
npx qrcode-terminal %URL%

echo.
echo Mantendo janela ativa. Pressione CTRL+C para encerrar o tunel.
:stop
timeout /t 5 > nul
goto stop
