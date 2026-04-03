import { TilePositionRule } from "../entities/tile.js";

export const ORTHOGONAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);

export const AROUND_DIRECTIONS_8 = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: 1 }),
  Object.freeze({ x: -1, y: -1 }),
]);

export const toCoordinateKey = (x, y) => `${x},${y}`;

const toRandomValue = (rng) => {
  const value = rng();
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error(`Placement generator rng returned invalid value: ${value}.`);
  }

  return value;
};

export const toRandomIndex = (length, rng) => {
  const value = toRandomValue(rng);
  return Math.floor(value * length);
};

export const shuffle = (items, rng) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = toRandomIndex(index + 1, rng);
    const temp = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = temp;
  }

  return shuffled;
};

export const isOrthogonallyAdjacent = (left, right) =>
  Math.abs(left.x - right.x) + Math.abs(left.y - right.y) === 1;

export const toTilePartitions = (tiles) => {
  const entrances = [];
  const insideTiles = [];
  const edgeTiles = [];

  for (const tile of tiles) {
    if (tile.positionRule === TilePositionRule.Entrance) {
      entrances.push(tile);
      continue;
    }

    if (tile.positionRule === TilePositionRule.Edges) {
      edgeTiles.push(tile);
      continue;
    }

    insideTiles.push(tile);
  }

  return { entrances, insideTiles, edgeTiles };
};
