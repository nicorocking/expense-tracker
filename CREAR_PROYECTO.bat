@echo off
echo ========================================
echo  CREANDO ESTRUCTURA DEL PROYECTO
echo ========================================
echo.

REM Crear estructura de carpetas
echo Creando carpetas...
mkdir backend\middleware 2>nul
mkdir backend\services 2>nul
mkdir frontend\src\components 2>nul
mkdir frontend\src\services 2>nul
mkdir frontend\public 2>nul

echo.
echo ========================================
echo  ESTRUCTURA CREADA
echo ========================================
echo.
echo Ahora debes:
echo 1. Extraer todos los archivos del ZIP
echo 2. Asegurarte de que los archivos esten en las carpetas correctas
echo 3. Ejecutar: cd backend ^&^& npm install
echo 4. Ejecutar: cd frontend ^&^& npm install
echo.
pause
