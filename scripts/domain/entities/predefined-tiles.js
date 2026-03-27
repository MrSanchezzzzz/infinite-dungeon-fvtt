import { PositionedTile, TilePositionRule, TileType } from "./tile.js";

export const PREDEFINED_TILE_DEFINITIONS = Object.freeze([
  Object.freeze({ type: TileType.Entrance, positionRule: TilePositionRule.Entrance }),
  Object.freeze({ type: TileType.Battle, positionRule: TilePositionRule.Inside }),
  Object.freeze({ type: TileType.Elite, positionRule: TilePositionRule.Inside }),
  Object.freeze({ type: TileType.Boss, positionRule: TilePositionRule.Edges }),
  Object.freeze({ type: TileType.Relic, positionRule: TilePositionRule.Edges }),
  Object.freeze({ type: TileType.Change, positionRule: TilePositionRule.Edges }),
  Object.freeze({ type: TileType.Shop, positionRule: TilePositionRule.Edges }),
  Object.freeze({ type: TileType.Event, positionRule: TilePositionRule.Inside }),
  Object.freeze({ type: TileType.Challenge, positionRule: TilePositionRule.Inside }),
  Object.freeze({ type: TileType.Rest, positionRule: TilePositionRule.Inside }),
  Object.freeze({ type: TileType.Forge, positionRule: TilePositionRule.Edges }),
]);

export const PREDEFINED_TILES = Object.freeze(
  PREDEFINED_TILE_DEFINITIONS.map(({ positionRule, type }) => new PositionedTile(positionRule, type)),
);
