import { TileCountPreset } from "./tile-count-preset.js";
import { TileType } from "./tile.js";

export const DEFAULT_TILE_COUNT_PRESET = Object.freeze(
  new TileCountPreset(
    "Default",
    new Map([
      [TileType.Entrance, 1],
      [TileType.Battle, 7],
      [TileType.Elite, 2],
      [TileType.Boss, 1],
      [TileType.Relic, 1],
      [TileType.Change, 1],
      [TileType.Shop, 1],
      [TileType.Event, 5],
      [TileType.Challenge, 3],
      [TileType.Rest, 2],
      [TileType.Forge, 1],
    ]),
    new Map([
      [TileType.Entrance, false],
      [TileType.Battle, true],
      [TileType.Elite, true],
      [TileType.Boss, true],
      [TileType.Relic, true],
      [TileType.Change, true],
      [TileType.Shop, true],
      [TileType.Event, true],
      [TileType.Challenge, true],
      [TileType.Rest, true],
      [TileType.Forge, true],
    ]),
  ),
);

export const PREDEFINED_TILE_COUNT_PRESETS = Object.freeze([DEFAULT_TILE_COUNT_PRESET]);
