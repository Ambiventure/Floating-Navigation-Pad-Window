@echo off
echo ===================================================
echo     Floating NavPad v2.16 - Windows EXE Builder
echo ===================================================
echo.

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python was not found in your system PATH!
    echo Please download and install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies (pyautogui, pyinstaller)...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing dependencies.
    pause
    exit /b 1
)

echo.
echo [3/3] Building standalone Windows EXE...
python -m PyInstaller --onefile --noconsole --name "NavPad-v2.16" navpad.py

if exist "dist\NavPad-v2.16.exe" (
    echo.
    echo ===================================================
    echo  SUCCESS! NavPad-v2.16.exe is ready!
    echo  Location: dist\NavPad-v2.16.exe
    echo ===================================================
    explorer.exe /select,"dist\NavPad-v2.16.exe"
) else (
    echo.
    echo Build failed. Please check the terminal logs above.
)

pause
