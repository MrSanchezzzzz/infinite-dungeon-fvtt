import { assertInteger } from "../../core/utils.js";

export const TilePositionRule = Object.freeze({
  Entrance: "Entrance",
  Inside: "Inside",
  Edges: "Edges",
});

export const TileType = Object.freeze({
  Entrance: "Entrance",
  Battle: "Battle",
  Elite: "Elite",
  Boss: "Boss",
  Relic: "Relic",
  Change: "Change",
  Shop: "Shop",
  Event: "Event",
  Challenge: "Challenge",
  Rest: "Rest",
  Forge: "Forge",
});

export const TILE_TYPES = Object.freeze(Object.values(TileType));
export const forEachTileType = (callback) => {
  for (const tileType of TILE_TYPES) {
    callback(tileType);
  }
};
export const mapTileTypes = (callback) => TILE_TYPES.map(callback);
export const reduceTileTypes = (callback, initialValue) => TILE_TYPES.reduce(callback, initialValue);

const TILE_POSITION_RULES = new Set(Object.values(TilePositionRule));
const TILE_TYPE_SET = new Set(TILE_TYPES);

export class Tile {
  constructor(positionRule, type) {
    if (!TILE_POSITION_RULES.has(positionRule)) {
      throw new Error(`Invalid tile position rule: ${positionRule}`);
    }

    if (!TILE_TYPE_SET.has(type)) {
      throw new Error(`Invalid tile type: ${type}`);
    }

    this.positionRule = positionRule;
    this.type = type;

    if (new.target === Tile) {
      Object.freeze(this);
    }
  }
}

export class PositionedTile extends Tile {
  constructor(positionRule, type, x = 0, y = 0) {
    super(positionRule, type);

    assertInteger(x, "x", "tile");
    assertInteger(y, "y", "tile");

    // Coordinates are measured from the center tile at (0, 0).
    this.x = x;
    this.y = y;
    Object.freeze(this);
  }
}
