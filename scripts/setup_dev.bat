@echo off
setlocal EnableExtensions

chcp 65001 >nul

set "ROOT_DIR=%~dp0.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%" || exit /b 1

if not defined PYTHON_BIN set "PYTHON_BIN=python"

set "VENV_DIR=%ROOT_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "DATABASE_ENV_FILE=%ROOT_DIR%\voidtalk_api\cfg\database_url.env"
set "RECOMMENDATIONS_ENV_FILE=%ROOT_DIR%\voidtalk_api\cfg\recommendations.env"
set "FRONTEND_CONFIG_FILE=%ROOT_DIR%\voidtalk_frontend\config.js"
set "FRONTEND_CONFIG_EXAMPLE=%ROOT_DIR%\voidtalk_frontend\config.example.js"
set "TEMP_REQUIREMENTS=%TEMP%\voidtalk_requirements_%RANDOM%_%RANDOM%.txt"

echo VoidTalk: setting up the development environment for Windows

%PYTHON_BIN% --version >nul 2>&1
if errorlevel 1 (
    echo Python was not found. Install Python 3.11+ and make sure it is available in PATH.
    exit /b 1
)

if not exist "%VENV_PYTHON%" (
    echo Creating .venv...
    %PYTHON_BIN% -m venv "%VENV_DIR%"
    if errorlevel 1 exit /b 1
)

echo Upgrading pip...
"%VENV_PYTHON%" -m pip install --upgrade pip
if errorlevel 1 exit /b 1

echo Normalizing requirements.txt encoding...
for %%E in (utf-16 utf-8-sig utf-8) do (
    "%VENV_PYTHON%" -c "from pathlib import Path; import sys; raw=Path('requirements.txt').read_bytes(); Path(sys.argv[2]).write_text(raw.decode(sys.argv[1]), encoding='utf-8')" %%E "%TEMP_REQUIREMENTS%" >nul 2>&1
    if not errorlevel 1 goto requirements_normalized
)
echo Could not read requirements.txt.
if exist "%TEMP_REQUIREMENTS%" del "%TEMP_REQUIREMENTS%"
exit /b 1

:requirements_normalized

echo Installing Python packages...
"%VENV_PYTHON%" -m pip install -r "%TEMP_REQUIREMENTS%"
set "PIP_RESULT=%ERRORLEVEL%"
if exist "%TEMP_REQUIREMENTS%" del "%TEMP_REQUIREMENTS%"
if not "%PIP_RESULT%"=="0" exit /b %PIP_RESULT%

if not exist "%ROOT_DIR%\voidtalk_api\cfg" mkdir "%ROOT_DIR%\voidtalk_api\cfg"

if not exist "%DATABASE_ENV_FILE%" (
    >"%DATABASE_ENV_FILE%" echo DATABASE_URL="sqlite:///./dev.db"
    echo Created %DATABASE_ENV_FILE%
)

if not exist "%RECOMMENDATIONS_ENV_FILE%" (
    >"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_DEFAULT_LIMIT=20
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_MAX_LIMIT=100
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER=8
    >>"%RECOMMENDATIONS_ENV_FILE%" echo.
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT=3.0
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT=1.5
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_EXPLORATION_SCORE=0.2
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_NO_HASHTAG_SCORE=0.05
    >>"%RECOMMENDATIONS_ENV_FILE%" echo.
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_POPULARITY_PENALTY_POWER=1.2
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS=21.0
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_MIN_FRESHNESS_SCORE=0.25
    >>"%RECOMMENDATIONS_ENV_FILE%" echo RECOMMENDATIONS_EXCLUDE_OWN_POSTS=true
    echo Created %RECOMMENDATIONS_ENV_FILE%
)

if not exist "%FRONTEND_CONFIG_FILE%" if exist "%FRONTEND_CONFIG_EXAMPLE%" (
    copy "%FRONTEND_CONFIG_EXAMPLE%" "%FRONTEND_CONFIG_FILE%" >nul
    echo Created %FRONTEND_CONFIG_FILE%
)

echo Applying migrations...
"%VENV_PYTHON%" -m alembic upgrade head
if errorlevel 1 exit /b 1

echo Checking FastAPI app...
"%VENV_PYTHON%" -c "from voidtalk_api.main import app; routes=[route.path for route in app.routes if getattr(route, 'path', '').startswith('/api')]; print('API routes:'); [print(f'  - {route}') for route in routes]"
if errorlevel 1 exit /b 1

echo.
echo Done.
echo.
echo Backend:
echo   .venv\Scripts\activate.bat
echo   uvicorn voidtalk_api.main:app --reload --host 127.0.0.1 --port 8000
echo.
echo Frontend:
echo   cd voidtalk_frontend
echo   python -m http.server 5173
echo.
echo If the frontend runs on 127.0.0.1:5173, the default API URL is http://127.0.0.1:8000
