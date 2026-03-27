export const TilePosition = Object.freeze({
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

const TILE_POSITIONS = new Set(Object.values(TilePosition));
const TILE_TYPES = new Set(Object.values(TileType));

export class Tile {
  constructor(position, type) {
    if (!TILE_POSITIONS.has(position)) {
      throw new Error(`Invalid tile position: ${position}`);
    }

    if (!TILE_TYPES.has(type)) {
      throw new Error(`Invalid tile type: ${type}`);
    }

    this.position = position;
    this.type = type;
    Object.freeze(this);
  }
}
