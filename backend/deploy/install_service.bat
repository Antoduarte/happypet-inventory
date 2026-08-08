@echo off
REM ============================================================================
REM Registra happypet-inventory como servicio de Windows usando waitress + NSSM.
REM
REM Requiere NSSM en el PATH (https://nssm.cc). Ejecutar COMO ADMINISTRADOR.
REM
REM Cada proyecto Django DEBE correr en su propio proceso: es justamente lo que
REM evita el error "_abc_impl is set to wrong type" que aparecia cuando este
REM proyecto y happypet compartian el proceso de Apache via mod_wsgi.
REM Ademas este proyecto usa Django 6.0 y happypet Django 4.2: en un mismo
REM proceso los sys.path de ambos venv se pisaban.
REM ============================================================================
setlocal
cd /d %~dp0..

set SERVICE=HappypetInventory
set PORT=8002
set PROJECT=%CD%

where nssm >nul 2>&1
if errorlevel 1 (
    echo ERROR: no se encontro nssm.exe en el PATH. Instalalo desde https://nssm.cc
    pause
    exit /b 1
)

if not exist "%PROJECT%\venv\Scripts\python.exe" (
    echo ERROR: no existe el venv. Ejecuta primero deploy\setup_inventory.bat
    pause
    exit /b 1
)

"%PROJECT%\venv\Scripts\python.exe" -c "import waitress" 2>nul
if errorlevel 1 (
    echo ERROR: falta waitress en el venv. Ejecuta primero deploy\setup_inventory.bat
    pause
    exit /b 1
)

echo Registrando servicio %SERVICE% en 127.0.0.1:%PORT% ...

REM Se invoca python.exe -m waitress y NO waitress-serve.exe a proposito:
REM los .exe que genera pip/uv llevan grabada la ruta absoluta del interprete
REM del momento de la instalacion, asi que renombrar o mover el venv los rompe
REM ("Failed to canonicalize script path"). python.exe resuelve su venv por
REM pyvenv.cfg, que es relativo a su propia ubicacion.
nssm install %SERVICE% "%PROJECT%\venv\Scripts\python.exe"
nssm set %SERVICE% AppParameters "-m waitress --listen=127.0.0.1:%PORT% --threads=8 config.wsgi:application"
nssm set %SERVICE% AppDirectory "%PROJECT%"
nssm set %SERVICE% DisplayName "Happypet Inventory (Django/waitress)"
nssm set %SERVICE% Description "happypet-inventory servido por waitress en 127.0.0.1:%PORT%, detras de Apache"
nssm set %SERVICE% Start SERVICE_AUTO_START

REM Logs del servicio
if not exist "%PROJECT%\logs" mkdir "%PROJECT%\logs"
nssm set %SERVICE% AppStdout "%PROJECT%\logs\waitress.log"
nssm set %SERVICE% AppStderr "%PROJECT%\logs\waitress-error.log"
nssm set %SERVICE% AppRotateFiles 1
nssm set %SERVICE% AppRotateBytes 10485760

REM Reinicio automatico si el proceso muere
nssm set %SERVICE% AppExit Default Restart
nssm set %SERVICE% AppRestartDelay 5000

echo.
echo Servicio registrado. Iniciando...
net start %SERVICE%

echo.
echo RECORDATORIO: la cuenta del servicio necesita permiso de ejecucion sobre
echo   C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe   (impresion de tickets)
echo Se configura con:  nssm set %SERVICE% ObjectName .\USUARIO CONTRASENA
pause
endlocal
