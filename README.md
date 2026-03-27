# Infinite Dungeon

A Foundry VTT module scaffold.

## Development

1. Enable this module in your Foundry world.
2. Open the browser console to verify init/ready logs.
3. Regenerate compendium data with `node --experimental-default-type=module scripts/data/fvtt/export-compendium.js`.

## Structure

- `module.json` - Foundry manifest
- `scripts/infinite-dungeon.js` - Module entrypoint
- `scripts/data/fvtt/models/fvtt-card-model.js` - Canonical FVTT `Card` model builder
- `scripts/data/fvtt/models/fvtt-deck-model.js` - Canonical FVTT `Cards` deck model builder
- `scripts/data/fvtt/models/index.js` - FVTT model exports
- `scripts/data/fvtt/export-compendium.js` - Compendium exporter from predefined deck model
- `scripts/core/id.js` - Shared ID constants/helpers (`ID_PREFIX`)
- `scripts/core/index.js` - Core exports
- `scripts/domain/entities/tile.js` - Domain entities (`Tile`, `TilePosition`, `TileType`)
- `scripts/domain/entities/predefined-tiles.js` - Predefined tile definitions and instances
- `scripts/domain/index.js` - Domain exports
- `scripts/data/fvtt/predefined-cards.js` - Predefined FVTT card objects
- `scripts/data/fvtt/predefined-deck.js` - Predefined FVTT `Cards` deck source (`Tiles`)
- `scripts/data/fvtt/index.js` - FVTT data exports
- `packs/infinite-dungeon-decks.db` - Module compendium data (`Infinite Dungeon Decks`)
- `styles/infinite-dungeon.css` - Module styles
- `lang/en.json` - Localization strings
