@echo off
setlocal

cd /d "%~dp0"

echo [1/2] Regenerating compendium .db...
node --experimental-default-type=module scripts\data\fvtt\export-compendium.js
if errorlevel 1 (
  echo Failed to regenerate compendium .db
  exit /b 1
)

echo [2/2] Removing LevelDB compendium cache folder...
if exist "packs\infinite-dungeon-decks" (
  rmdir /s /q "packs\infinite-dungeon-decks"
)

echo Done. Start Foundry again to rebuild the compendium from the updated .db file.
exit /b 0
