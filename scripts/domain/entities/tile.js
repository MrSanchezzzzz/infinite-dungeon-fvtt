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

const TILE_POSITION_RULES = new Set(Object.values(TilePositionRule));
const TILE_TYPES = new Set(Object.values(TileType));

export class Tile {
  constructor(positionRule, type) {
    if (!TILE_POSITION_RULES.has(positionRule)) {
      throw new Error(`Invalid tile position rule: ${positionRule}`);
    }

    if (!TILE_TYPES.has(type)) {
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
