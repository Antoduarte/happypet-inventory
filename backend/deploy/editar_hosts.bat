@echo off
setlocal
REM Abre el archivo hosts como administrador para editar.
net session >nul 2>&1
if not "%errorlevel%"=="0" (
    powershell -NoProfile -Command "Start-Process -FilePath 'notepad.exe' -ArgumentList 'C:\Windows\System32\drivers\etc\hosts' -Verb RunAs"
    exit /b
)
notepad C:\Windows\System32\drivers\etc\hosts
