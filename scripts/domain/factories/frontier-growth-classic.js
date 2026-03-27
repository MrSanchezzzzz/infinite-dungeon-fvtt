import { assertInteger, assertType } from "../../core/utils.js";
import { TilePositionRule } from "../entities/tile.js";
import { LayerPlacementGenerator } from "./layer-placement-generator.js";

const ORTHOGONAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);
const AROUND_DIRECTIONS_8 = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: 1 }),
  Object.freeze({ x: -1, y: -1 }),
]);

const toCoordinateKey = (x, y) => `${x},${y}`;

const toRandomIndex = (length, rng) => {
  const value = rng();
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error(`FrontierGrowthClassic rng returned invalid value: ${value}.`);
  }

  return Math.floor(value * length);
};

const pickRandom = (items, rng) => items[toRandomIndex(items.length, rng)];

const shuffle = (items, rng) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = toRandomIndex(index + 1, rng);
    const temp = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = temp;
  }

  return shuffled;
};

const isOrthogonallyAdjacent = (left, right) => {
  const xDistance = Math.abs(left.x - right.x);
  const yDistance = Math.abs(left.y - right.y);
  return xDistance + yDistance === 1;
};

const toOrthogonalNeighbors = (x, y) => ORTHOGONAL_DIRECTIONS.map((direction) => ({
  x: x + direction.x,
  y: y + direction.y,
}));
const toAroundNeighbors8 = (x, y) => AROUND_DIRECTIONS_8.map((direction) => ({
  x: x + direction.x,
  y: y + direction.y,
}));

const selectNonAdjacentCoordinates = (candidates, count, rng) => {
  if (count === 0) return [];
  if (count > candidates.length) return null;

  const shuffled = shuffle(candidates, rng);
  const selected = [];

  const backtrack = (startIndex) => {
    if (selected.length === count) return true;

    const remainingSlots = count - selected.length;
    if (shuffled.length - startIndex < remainingSlots) return false;

    for (let index = startIndex; index < shuffled.length; index += 1) {
      const candidate = shuffled[index];
      if (selected.some((existing) => isOrthogonallyAdjacent(existing, candidate))) {
        continue;
      }

      selected.push(candidate);
      if (backtrack(index + 1)) return true;
      selected.pop();
    }

    return false;
  };

  return backtrack(0) ? [...selected] : null;
};

const toTilePartitions = (tiles) => {
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

const toNeighborCountByCoordinate = (coordinates, neighborsProvider) => {
  const occupied = new Set(coordinates.map(({ x, y }) => toCoordinateKey(x, y)));
  const counts = new Map();

  for (const coordinate of coordinates) {
    let count = 0;
    for (const neighbor of neighborsProvider(coordinate.x, coordinate.y)) {
      if (occupied.has(toCoordinateKey(neighbor.x, neighbor.y))) {
        count += 1;
      }
    }

    counts.set(toCoordinateKey(coordinate.x, coordinate.y), count);
  }

  return counts;
};

const isValidFinalLayout = (placements) => {
  const coordinates = placements.map(({ x, y }) => ({ x, y }));
  const orthogonalNeighborCountByCoordinate = toNeighborCountByCoordinate(
    coordinates,
    toOrthogonalNeighbors,
  );
  const around8NeighborCountByCoordinate = toNeighborCountByCoordinate(coordinates, toAroundNeighbors8);

  for (const placement of placements) {
    const key = toCoordinateKey(placement.x, placement.y);
    const orthogonalNeighborCount = orthogonalNeighborCountByCoordinate.get(key) ?? 0;
    if (orthogonalNeighborCount < 1) return false;

    if (placement.tile.positionRule === TilePositionRule.Edges && orthogonalNeighborCount !== 1) {
      return false;
    }

    const aroundCount = around8NeighborCountByCoordinate.get(key) ?? 0;
    if (aroundCount > 6) {
      return false;
    }
  }

  return true;
};

const buildAttemptPlacements = ({ coreTiles, edgeTiles, rng }) => {
  const frontier = new Map();
  const occupied = new Set();
  const placements = [];

  const placeTile = (tile, x, y) => {
    const key = toCoordinateKey(x, y);
    if (occupied.has(key)) {
      throw new Error(`FrontierGrowthClassic generated duplicate occupied coordinate: (${x}, ${y}).`);
    }

    occupied.add(key);
    frontier.delete(key);
    placements.push({ tile, x, y });

    for (const neighbor of toOrthogonalNeighbors(x, y)) {
      const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
      if (occupied.has(neighborKey)) continue;

      const existing = frontier.get(neighborKey);
      if (existing) {
        existing.adjacentOccupiedCount += 1;
        continue;
      }

      frontier.set(neighborKey, {
        x: neighbor.x,
        y: neighbor.y,
        adjacentOccupiedCount: 1,
      });
    }
  };

  placeTile(coreTiles[0], 0, 0);
  for (let index = 1; index < coreTiles.length; index += 1) {
    if (frontier.size === 0) return null;

    const frontierCandidates = Array.from(frontier.values());
    const coordinate = pickRandom(frontierCandidates, rng);
    placeTile(coreTiles[index], coordinate.x, coordinate.y);
  }

  const leafFrontierCoordinates = Array.from(frontier.values()).filter(
    (coordinate) => coordinate.adjacentOccupiedCount === 1,
  );
  const selectedEdgeCoordinates = selectNonAdjacentCoordinates(
    leafFrontierCoordinates,
    edgeTiles.length,
    rng,
  );
  if (!selectedEdgeCoordinates) return null;

  for (let index = 0; index < edgeTiles.length; index += 1) {
    const coordinate = selectedEdgeCoordinates[index];
    placements.push({
      tile: edgeTiles[index],
      x: coordinate.x,
      y: coordinate.y,
    });
  }

  return isValidFinalLayout(placements) ? placements : null;
};

export class FrontierGrowthClassic extends LayerPlacementGenerator {
  constructor({ rng = Math.random, maxAttempts = 200 } = {}) {
    super();
    assertType(rng, Function, "rng", "FrontierGrowthClassic");
    assertInteger(maxAttempts, "maxAttempts", "FrontierGrowthClassic");
    if (maxAttempts < 1) {
      throw new Error(`Invalid FrontierGrowthClassic maxAttempts: ${maxAttempts}. Expected >= 1.`);
    }

    this.rng = rng;
    this.maxAttempts = maxAttempts;
    Object.freeze(this);
  }

  generate({ tiles }) {
    assertType(tiles, Array, "tiles", "FrontierGrowthClassic");
    if (tiles.length < 2) {
      throw new Error("FrontierGrowthClassic requires at least 2 tiles for adjacency constraints.");
    }

    const { entrances, insideTiles, edgeTiles } = toTilePartitions(tiles);
    if (entrances.length === 0) {
      throw new Error("FrontierGrowthClassic requires at least one Entrance tile.");
    }

    const anchorEntrance = entrances[0];
    const additionalEntrances = entrances.slice(1);
    const coreTiles = [anchorEntrance, ...insideTiles, ...additionalEntrances];

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const placements = buildAttemptPlacements({
        coreTiles,
        edgeTiles,
        rng: this.rng,
      });

      if (placements) return placements;
    }

    throw new Error(
      `FrontierGrowthClassic failed after ${this.maxAttempts} attempts. ` +
        `Constraints unsatisfied for ${tiles.length} tiles (${edgeTiles.length} edge tiles).`,
    );
  }
}
