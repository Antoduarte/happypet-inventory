@echo off
setlocal
REM ============================================================
REM  setup_inventory.bat
REM  Instalacion del proyecto happypet-inventory en la maquina
REM  del CLIENTE (Python 3.12 + Apache 2.4 + mod_wsgi).
REM
REM  Correr UNA sola vez. El archivo debe quedar dentro de la
REM  carpeta "deploy" del proyecto (que ya viene copiada junto
REM  con el resto del proyecto).
REM ============================================================

REM 1) Carpeta raiz del proyecto = padre de la carpeta deploy
set "PROJECT_DIR=%~dp0.."
cd /d "%PROJECT_DIR%"

echo [1/7] Creando entorno virtual con Python 3.12...
py -3.12 -m venv venv
if errorlevel 1 goto :error

call venv\Scripts\activate.bat

echo [2/7] Actualizando pip...
python -m pip install --upgrade pip
if errorlevel 1 goto :error

echo [3/7] Instalando dependencias del proyecto...
pip install -r requirements.txt
if errorlevel 1 goto :error

echo [4/7] Instalando mod_wsgi para Python 3.12...
pip install mod_wsgi
if errorlevel 1 goto :error

echo [5/7] Verificando el modulo mod_wsgi cp312...
if exist "venv\Lib\site-packages\mod_wsgi\server\mod_wsgi.cp312-win_amd64.pyd" (
    echo      OK: mod_wsgi.cp312-win_amd64.pyd encontrado.
) else (
    echo      ADVERTENCIA: no se encontro mod_wsgi.cp312-win_amd64.pyd.
    echo      Revisa que Python 3.12 de 64 bits este instalado y que el
    echo      venv se haya creado con el.
)

echo [6/7] Aplicando migraciones...
python manage.py migrate
if errorlevel 1 goto :error

echo [7/7] Recopilando estaticos (whitenoise)...
python manage.py collectstatic --noinput
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  INSTALACION COMPLETA.
echo.
echo  Siguiente: reinicia Apache y proba http://inventory.local/
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
