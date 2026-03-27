import { Tile, TilePosition, TileType } from "./tile.js";

export const PREDEFINED_TILE_DEFINITIONS = Object.freeze([
  Object.freeze({ type: TileType.Entrance, position: TilePosition.Entrance }),
  Object.freeze({ type: TileType.Battle, position: TilePosition.Inside }),
  Object.freeze({ type: TileType.Elite, position: TilePosition.Inside }),
  Object.freeze({ type: TileType.Boss, position: TilePosition.Edges }),
  Object.freeze({ type: TileType.Relic, position: TilePosition.Edges }),
  Object.freeze({ type: TileType.Change, position: TilePosition.Edges }),
  Object.freeze({ type: TileType.Shop, position: TilePosition.Edges }),
  Object.freeze({ type: TileType.Event, position: TilePosition.Inside }),
  Object.freeze({ type: TileType.Challenge, position: TilePosition.Inside }),
  Object.freeze({ type: TileType.Rest, position: TilePosition.Edges }),
  Object.freeze({ type: TileType.Forge, position: TilePosition.Edges }),
]);

export const PREDEFINED_TILES = Object.freeze(
  PREDEFINED_TILE_DEFINITIONS.map(({ position, type }) => new Tile(position, type)),
);
