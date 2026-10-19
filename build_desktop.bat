@echo off
echo ============================================================
echo      NutriVision - Desktop Application Build Pipeline
echo ============================================================
echo.

echo [1/2] Compiling Frontend (Vite Build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b %errorlevel%
)

if not exist "dist\assets\libs" mkdir "dist\assets\libs"
xcopy /y /e /i "src\assets\libs" "dist\assets\libs"

echo.
echo [2/2] Packaging Standalone Executable (PyInstaller)...
call .\backend\venv\Scripts\pyinstaller.exe nutrivision.spec --noconfirm
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller packaging failed.
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo  BUILD SUCCESSFUL!
echo  Portable Desktop App: dist\NutriVisionApp\NutriVision.exe
echo ============================================================
echo.
