# Infinite Dungeon

A Foundry VTT module scaffold.

## Development

1. Enable this module in your Foundry world.
2. Open the browser console to verify init/ready logs.
3. Regenerate compendium data with `node --experimental-default-type=module scripts/data/fvtt/export-compendium.js`.

## Structure

- `module.json` - Foundry manifest
- `scripts/infinite-dungeon.js` - Module entrypoint
- `scripts/application/use-cases/generate-dungeon-level-hand.js` - Use-case for creating a generated dungeon-level hand
- `scripts/application/use-cases/generate-dungeon-level-and-place-on-canvas.js` - Use-case for generating a dungeon layer and placing cards on canvas
- `scripts/application/index.js` - Application-layer exports
- `scripts/data/fvtt/models/fvtt-card-model.js` - Canonical FVTT `Card` model builder
- `scripts/data/fvtt/models/fvtt-deck-model.js` - Canonical FVTT `Cards` deck model builder
- `scripts/data/fvtt/models/index.js` - FVTT model exports
- `scripts/data/fvtt/export-compendium.js` - Compendium exporter from predefined deck model
- `scripts/data/fvtt/repositories/cards-repository.js` - FVTT cards/deck repository adapter
- `scripts/data/fvtt/repositories/index.js` - Repository exports
- `scripts/core/id.js` - Shared ID constants/helpers (`ID_PREFIX`)
- `scripts/core/utils.js` - Shared assertion helpers (`assertInteger`, `assertString`, `assertType`)
- `scripts/core/index.js` - Core exports
- `scripts/domain/entities/tile.js` - Domain tile entities (`PositionedTile`, `Tile`, `TilePositionRule`, `TileType`)
- `scripts/domain/entities/tile-count-preset.js` - Domain tile count preset entity (`TileCountPreset`)
- `scripts/domain/entities/predefined-tile-count-presets.js` - Predefined tile count presets (`DEFAULT_TILE_COUNT_PRESET`)
- `scripts/domain/entities/layer.js` - Domain layer entity (`Layer`, tiles as `Map<number, Map<number, PositionedTile>>`)
- `scripts/domain/factories/layer-placement-generator.js` - Abstract placement strategy base class (`LayerPlacementGenerator`)
- `scripts/domain/factories/frontier-growth-classic.js` - Frontier growth placement strategy (`FrontierGrowthClassic`)
- `scripts/domain/factories/layer-factory.js` - Layer construction factory using placement strategies (`LayerFactory`)
- `scripts/domain/entities/predefined-tiles.js` - Predefined tile definitions and instances
- `scripts/domain/validation/dungeon-level-validation.js` - Domain rules and validation for dungeon level generation
- `scripts/domain/index.js` - Domain exports
- `scripts/data/fvtt/predefined-cards.js` - Predefined FVTT card objects
- `scripts/data/fvtt/predefined-deck.js` - Predefined FVTT `Cards` deck source (`Tiles`)
- `scripts/data/fvtt/index.js` - FVTT data exports
- `scripts/presentation/fvtt/dialogs/generate-dungeon-level-dialog.js` - UI dialog for dungeon level configuration
- `scripts/presentation/fvtt/context-menus/cards-context-menu.js` - Cards-directory context menu integration
- `scripts/presentation/fvtt/index.js` - Presentation FVTT exports
- `scripts/presentation/index.js` - Presentation-layer exports
- `packs/infinite-dungeon-decks.db` - Module compendium data (`Infinite Dungeon Decks`)
- `styles/infinite-dungeon.css` - Module styles
- `lang/en.json` - Localization strings
