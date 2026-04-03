@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
set "CACHE_DIR=packs\infinite-dungeon-decks"

echo [1/2] Regenerating compendium .db...
node --experimental-default-type=module scripts\data\fvtt\export-compendium.js
if errorlevel 1 (
  echo Failed to regenerate compendium .db
  exit /b 1
)

echo [2/2] Removing LevelDB compendium cache folder...
if exist "%CACHE_DIR%" (
  set "RMDIR_LOG=%TEMP%\infinite-dungeon-rmdir-%RANDOM%%RANDOM%.log"
  rmdir /s /q "%CACHE_DIR%" >nul 2>"!RMDIR_LOG!"

  if exist "%CACHE_DIR%" (
    findstr /i /c:"being used by another process" "!RMDIR_LOG!" >nul
    if not errorlevel 1 (
      echo Could not invalidate compendium cache: another process is using pack files.
      echo Close Foundry VTT and try again.
    ) else (
      echo Could not invalidate compendium cache folder: "%CACHE_DIR%"
      echo Details:
      type "!RMDIR_LOG!"
    )

    del /q "!RMDIR_LOG!" >nul 2>nul
    exit /b 1
  )

  del /q "!RMDIR_LOG!" >nul 2>nul
)

echo Done. Start Foundry again to rebuild the compendium from the updated .db file.
exit /b 0
