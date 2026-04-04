# Agent Guidelines

## Commit Rules

- Use this subject format: `v <major>.<minor>.<patch>: <short summary>`.
- Increment the version on every new commit in both places: commit subject and `module.json`.
- Keep the summary short and action-oriented.
- Match repository style by keeping `v` lowercase and including a space before the version.
- Do not include `Co-authored-by` trailers unless explicitly requested.
- Do not include unrelated files in a feature/fix commit.

### Examples

- `v 1.2.3: shuffle tiles before layer placement`
- `v 1.2.2: add Continious Distribution`

## Project Architecture Overview

This module follows a layered architecture so domain logic stays independent from Foundry APIs.

### Runtime Entry

- `scripts/infinite-dungeon.js` is the module entrypoint from `module.json`.
- On `init`, it registers the deck context menu action.
- On `ready`, it registers tile visit HUD controls and visual patches.

### Layers and Responsibilities

- `scripts/core/`
  - Shared constants, id helpers, and runtime assertions.
- `scripts/domain/`
  - Pure, immutable game logic: tile/layer entities, config validation, presets, and placement generators.
  - `GrowingTreeLooped` is the default generator; `FrontierGrowthClassic` is an alternative algorithm.
- `scripts/application/`
  - Bridge between user interaction and /domain/
- `scripts/data/fvtt/`
  - Foundry + other modules adapters.
  - Repositories handle deck/card creation, card placement/removal, and tile visit state persistence in flags.
  - Predefined deck/card models and export script build the compendium source data.
- `scripts/presentation/fvtt/`
  - UI integration points: cards context menu, generation dialog, card HUD controls, and canvas visuals.
  - Converts application outcomes into notifications and visual feedback.

### Key Data Contracts

- Module identity scope is `infinite-dungeon` (`IDENTITY_FLAG_SCOPE`).
- Predefined deck is identified by `infinite-dungeon-deck-tiles`.
- Tile card identity and tile metadata are stored in card flags.
- Scene placement linkage uses CCM scene/card flags; visit state is module-owned and scene-keyed.

### Important Files at a Glance

- `module.json`: Foundry manifest, dependency declaration, and module entry script.
- `scripts/infinite-dungeon.js`: lifecycle hook registration.
- `scripts/domain/factories/growing-tree-looped.js`: primary layout algorithm.
- `scripts/application/use-cases/generate-dungeon-level-and-place-on-canvas.js`: end-to-end generation orchestration.
- `scripts/data/fvtt/repositories/`: Foundry/CCM data access boundary.
- `scripts/presentation/fvtt/`: UI hooks, dialog, HUD controls, and canvas visuals.
