@echo off
setlocal
REM ============================================================
REM  setup_inventory.bat
REM  Instalacion del proyecto happypet-inventory en la maquina
REM  del CLIENTE (Python 3.12 + waitress, detras de Apache).
REM
REM  Correr UNA sola vez. El archivo debe quedar dentro de la
REM  carpeta "deploy" del proyecto (que ya viene copiada junto
REM  con el resto del proyecto).
REM
REM  IMPORTANTE: este proyecto YA NO se sirve con mod_wsgi.
REM  Corre en su propio proceso con waitress en 127.0.0.1:8002
REM  y Apache actua solo como reverse proxy. Ver PASOS_A_REALIZAR.txt.
REM ============================================================

REM 1) Carpeta raiz del proyecto = padre de la carpeta deploy
set "PROJECT_DIR=%~dp0.."
cd /d "%PROJECT_DIR%"

echo [1/5] Creando entorno virtual con Python 3.12...
py -3.12 -m venv venv
if errorlevel 1 goto :error

call venv\Scripts\activate.bat

echo [2/5] Actualizando pip...
python -m pip install --upgrade pip
if errorlevel 1 goto :error

echo [3/5] Instalando dependencias del proyecto...
pip install -r requirements.txt
if errorlevel 1 goto :error

echo [4/5] Aplicando migraciones...
python manage.py migrate
if errorlevel 1 goto :error

echo [5/5] Recopilando estaticos (whitenoise)...
python manage.py collectstatic --noinput
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  INSTALACION COMPLETA.
echo.
echo  Proba el arranque a mano antes de crear el servicio:
echo     venv\Scripts\python.exe -m waitress --listen=127.0.0.1:8002 --threads=8 config.wsgi:application
echo.
echo  Despues registra el servicio (como Administrador):
echo     deploy\install_service.bat
echo.
echo  Si falta algo, revisa PASOS_A_REALIZAR.txt.
echo ============================================================
pause
exit /b 0

:error
echo.
echo  ERROR durante la instalacion. Revisa el mensaje de arriba.
echo  Recorda: el archivo .env debe existir en "%PROJECT_DIR%"
echo  con la variable DATABASE_URL configurada.
pause
exit /b 1
