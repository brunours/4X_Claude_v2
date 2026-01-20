@echo off
REM Windows batch script to deploy 4X Space Game to GitHub

echo ================================================================================
echo                    4X SPACE GAME - GITHUB DEPLOYMENT
echo ================================================================================
echo.

set /p USERNAME="Enter your GitHub username: "

if "%USERNAME%"=="" (
    echo ERROR: Username cannot be empty
    pause
    exit /b 1
)

echo.
echo Repository will be created at:
echo   https://github.com/%USERNAME%/4X-Space-Game
echo.
echo Your game URL will be:
echo   https://%USERNAME%.github.io/4X-Space-Game/
echo.

echo ================================================================================
echo STEP 1: Create GitHub Repository
echo ================================================================================
echo.
echo Please open this URL in your browser:
echo   https://github.com/new
echo.
echo Repository settings:
echo   - Name: 4X-Space-Game
echo   - Description: A 4X space strategy game built with vanilla JavaScript
echo   - Public repository
echo   - Do NOT check: README, .gitignore, or license
echo.
pause

echo.
echo ================================================================================
echo STEP 2: Configuring Git Remote
echo ================================================================================
echo.

git remote remove origin 2>NUL
git remote add origin https://github.com/%USERNAME%/4X-Space-Game.git

if errorlevel 1 (
    echo ERROR: Failed to add remote repository
    pause
    exit /b 1
)

echo Remote added successfully!
echo.

echo ================================================================================
echo STEP 3: Renaming Branch to Main
echo ================================================================================
echo.

git branch -M main

if errorlevel 1 (
    echo ERROR: Failed to rename branch
    pause
    exit /b 1
)

echo Branch renamed to main successfully!
echo.

echo ================================================================================
echo STEP 4: Pushing to GitHub
echo ================================================================================
echo.
echo You will be prompted for authentication:
echo   - Username: %USERNAME%
echo   - Password: Your Personal Access Token (NOT your account password)
echo.
echo If you don't have a token, create one at:
echo   https://github.com/settings/tokens/new
echo.
pause

git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR: Failed to push to GitHub
    echo.
    echo Common issues:
    echo   - Wrong username or token
    echo   - Repository doesn't exist on GitHub
    echo   - Network connection problem
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo SUCCESS! Your code is on GitHub!
echo ================================================================================
echo.
echo Repository: https://github.com/%USERNAME%/4X-Space-Game
echo.
echo ================================================================================
echo STEP 5: Enable GitHub Pages
echo ================================================================================
echo.
echo To make your game live:
echo   1. Go to: https://github.com/%USERNAME%/4X-Space-Game/settings/pages
echo   2. Under 'Source', select 'Deploy from a branch'
echo   3. Under 'Branch', select 'main' and '/ (root)'
echo   4. Click 'Save'
echo.
echo Your game will be available at:
echo   https://%USERNAME%.github.io/4X-Space-Game/
echo.
echo (It may take 1-2 minutes to become available)
echo.
echo Opening GitHub Pages settings in your browser...
start https://github.com/%USERNAME%/4X-Space-Game/settings/pages

echo.
echo ================================================================================
echo DEPLOYMENT COMPLETE!
echo ================================================================================
echo.

pause
