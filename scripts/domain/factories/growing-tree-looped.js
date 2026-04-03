import { assertInteger, assertType } from "../../core/utils.js";
import { TilePositionRule } from "../entities/tile.js";
import { LayerPlacementGenerator } from "./layer-placement-generator.js";
import {
  AROUND_DIRECTIONS_8,
  ORTHOGONAL_DIRECTIONS,
  isOrthogonallyAdjacent,
  shuffle,
  toCoordinateKey,
  toRandomIndex,
  toTilePartitions,
} from "./placement-utils.js";

// Generation tuning constants.
// Retry budget for complete generation attempts.
// Higher => more robust but potentially slower in worst case.
const DEFAULT_MAX_ATTEMPTS = 1000;
// Hard cap for occupied neighbors in the 8-cell ring around each tile.
// Higher => denser layouts and more local clustering.
const DEFAULT_MAX_AROUND_NEIGHBORS = 5;
// Growing-tree active-cell selector mix.
// Higher => more "newest" (depth-first feel, longer corridors).
// Lower => more random picks (wider branching).
const ACTIVE_CELL_SELECT_NEWEST_PROBABILITY = 0.35;
// Chance to prefer candidates with >= 2 orthogonal neighbors (loop/junction injection).
// Higher => more loops/junctions; lower => more tree-like flow.
const LOOP_INJECTION_CHANCE = 0.25;
// Reward for changing direction from the previous step.
// Higher => more turns and less straight continuation.
const TURN_BONUS = 1.35;
// Penalty for continuing in the same direction.
// Higher => fewer long straight runs.
const STRAIGHT_PENALTY = 1.0;
// Reward per extra orthogonal occupied neighbor beyond 1.
// Higher => favors branch/junction nodes.
const JUNCTION_BONUS_PER_EXTRA_ORTHOGONAL_NEIGHBOR = 2.0;
// Reward for candidate cells that keep more legal future expansion options.
// Higher => prefers open, expandable regions.
const OPEN_NEIGHBOR_BONUS = 0.45;
// Penalty per occupied 8-neighbor around the candidate.
// Higher => pushes growth away from crowded areas.
const AROUND_COUNT_PENALTY = 0.25;
// Positive floor added to weighted-random candidate selection.
// Higher => more randomness among similarly scored candidates.
const CANDIDATE_WEIGHT_EPSILON = 0.05;
// Penalty per diagonal contact created by a candidate.
// Higher => suppresses diagonal touch patterns.
const DIAGONAL_CONTACT_PENALTY = 0.6;
// Penalty for creating new 3-of-4 windows in 2x2 blocks (stair L-shapes).
// Higher => reduces staircase-like diagonals.
const STAIR_L_SHAPE_PENALTY = 1.4;
// Extra penalty when a new stair L-shape continues an existing diagonal stair run.
// Higher => strongly discourages repeated staircase continuation.
const STAIR_CONTINUATION_PENALTY = 2.2;
// Optional hard cap on diagonal stair-run length based on chained 3-of-4 windows.
// 0 => disabled (soft penalties only). >0 => rejects placements exceeding this run length.
const MAX_STAIR_RUN = 2; // 0 disables hard cap and keeps anti-stair control as soft scoring only.
// Minimum orthogonal-neighbor count required for "loop injection" candidate set.
// Higher => stricter loop creation trigger.
const MIN_ORTHOGONAL_NEIGHBORS_FOR_LOOP = 2;
const ORIGIN_X = 0;
const ORIGIN_Y = 0;
const MAX_AROUND_NEIGHBORS_LIMIT = 8;
const DIAGONAL_STAIR_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: 1 }),
  Object.freeze({ x: -1, y: -1 }),
]);
const ORTHOGONAL_DIRECTION_IDS = Object.freeze(["east", "west", "south", "north"]);

// const DEFAULT_MAX_AROUND_NEIGHBORS = 4;
// const ACTIVE_CELL_SELECT_NEWEST_PROBABILITY = 0.25;
// const LOOP_INJECTION_CHANCE = 0.1;
// const TURN_BONUS = 1.8;
// const STRAIGHT_PENALTY = 1.0;
// const JUNCTION_BONUS_PER_EXTRA_ORTHOGONAL_NEIGHBOR = 1.0;
// const OPEN_NEIGHBOR_BONUS = 0.45;
// const AROUND_COUNT_PENALTY = 0.8;
// const CANDIDATE_WEIGHT_EPSILON = 0.05;
// const MIN_ORTHOGONAL_NEIGHBORS_FOR_LOOP = 2;
// const ORIGIN_X = 0;
// const ORIGIN_Y = 0;
// const MAX_AROUND_NEIGHBORS_LIMIT = 8;

const toOrthogonalNeighbors = (x, y) => ORTHOGONAL_DIRECTIONS.map((direction) => ({
  x: x + direction.x,
  y: y + direction.y,
}));

const toAroundNeighbors8 = (x, y) => AROUND_DIRECTIONS_8.map((direction) => ({
  x: x + direction.x,
  y: y + direction.y,
}));
const toDiagonalNeighbors = (x, y) => DIAGONAL_STAIR_DIRECTIONS.map((direction) => ({
  x: x + direction.x,
  y: y + direction.y,
}));

const toRandomValue = (rng) => {
  const value = rng();
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error(`GrowingTreeLooped rng returned invalid value: ${value}.`);
  }

  return value;
};

const assertProbability = (value, name, entity) => {
  assertType(value, Number, name, entity);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid ${entity} ${name}: ${value}. Expected a finite probability in [0, 1].`);
  }
};

const assertFiniteNumber = (value, name, entity) => {
  assertType(value, Number, name, entity);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${entity} ${name}: ${value}. Expected a finite number.`);
  }
};

const countOccupiedNeighbors = (occupied, x, y, neighborsProvider) => {
  let count = 0;
  for (const neighbor of neighborsProvider(x, y)) {
    if (occupied.has(toCoordinateKey(neighbor.x, neighbor.y))) {
      count += 1;
    }
  }

  return count;
};

const toThreeOfFourWindowDescriptorKey = ({
  anchorX,
  anchorY,
  missingXOffset,
  missingYOffset,
}) => `${anchorX},${anchorY}|${missingXOffset},${missingYOffset}`;

const toThreeOfFourWindows = (occupied) => {
  const anchorKeys = new Set();

  for (const coordinateKey of occupied) {
    const [rawX, rawY] = coordinateKey.split(",");
    const x = Number(rawX);
    const y = Number(rawY);

    for (let anchorX = x - 1; anchorX <= x; anchorX += 1) {
      for (let anchorY = y - 1; anchorY <= y; anchorY += 1) {
        anchorKeys.add(`${anchorX},${anchorY}`);
      }
    }
  }

  const windows = [];
  for (const anchorKey of anchorKeys) {
    const [rawAnchorX, rawAnchorY] = anchorKey.split(",");
    const anchorX = Number(rawAnchorX);
    const anchorY = Number(rawAnchorY);

    let occupiedCount = 0;
    let missingXOffset = null;
    let missingYOffset = null;
    for (let xOffset = 0; xOffset <= 1; xOffset += 1) {
      for (let yOffset = 0; yOffset <= 1; yOffset += 1) {
        const squareKey = toCoordinateKey(anchorX + xOffset, anchorY + yOffset);
        if (occupied.has(squareKey)) {
          occupiedCount += 1;
          continue;
        }

        missingXOffset = xOffset;
        missingYOffset = yOffset;
      }
    }

    if (occupiedCount === 3) {
      windows.push({
        anchorX,
        anchorY,
        missingXOffset,
        missingYOffset,
      });
    }
  }

  return windows;
};

const toRunLengthThroughWindow = (
  windowSet,
  { anchorX, anchorY, missingXOffset, missingYOffset },
  stepX,
  stepY,
) => {
  let runLength = 1;

  for (let offset = 1; ; offset += 1) {
    const forwardKey = toThreeOfFourWindowDescriptorKey({
      anchorX: anchorX + stepX * offset,
      anchorY: anchorY + stepY * offset,
      missingXOffset,
      missingYOffset,
    });
    if (!windowSet.has(forwardKey)) break;
    runLength += 1;
  }

  for (let offset = 1; ; offset += 1) {
    const backwardKey = toThreeOfFourWindowDescriptorKey({
      anchorX: anchorX - stepX * offset,
      anchorY: anchorY - stepY * offset,
      missingXOffset,
      missingYOffset,
    });
    if (!windowSet.has(backwardKey)) break;
    runLength += 1;
  }

  return runLength;
};

const toMaxStairRunLength = (windows) => {
  if (windows.length === 0) return 0;

  const windowSet = new Set(windows.map(toThreeOfFourWindowDescriptorKey));
  let maxRunLength = 1;
  for (const window of windows) {
    const positiveSlopeRunLength = toRunLengthThroughWindow(windowSet, window, 1, 1);
    const negativeSlopeRunLength = toRunLengthThroughWindow(windowSet, window, 1, -1);
    maxRunLength = Math.max(maxRunLength, positiveSlopeRunLength, negativeSlopeRunLength);
  }

  return maxRunLength;
};

const toDiagonalPatternMetricsAfterPlacement = (occupied, x, y) => {
  const diagonalNeighborCount = countOccupiedNeighbors(occupied, x, y, toDiagonalNeighbors);

  const occupiedWithCandidate = new Set(occupied);
  occupiedWithCandidate.add(toCoordinateKey(x, y));

  const beforeWindows = toThreeOfFourWindows(occupied);
  const afterWindows = toThreeOfFourWindows(occupiedWithCandidate);
  const beforeWindowKeys = new Set(beforeWindows.map(toThreeOfFourWindowDescriptorKey));
  const newWindows = afterWindows.filter(
    (window) => !beforeWindowKeys.has(toThreeOfFourWindowDescriptorKey(window)),
  );

  let stairContinuationCount = 0;
  for (const window of newWindows) {
    for (const direction of DIAGONAL_STAIR_DIRECTIONS) {
      const adjacentWindowKey = toThreeOfFourWindowDescriptorKey({
        anchorX: window.anchorX + direction.x,
        anchorY: window.anchorY + direction.y,
        missingXOffset: window.missingXOffset,
        missingYOffset: window.missingYOffset,
      });
      if (beforeWindowKeys.has(adjacentWindowKey)) {
        stairContinuationCount += 1;
      }
    }
  }

  return {
    diagonalNeighborCount,
    stairLShapeCount: newWindows.length,
    stairContinuationCount,
    maxStairRunLength: toMaxStairRunLength(afterWindows),
  };
};

const wouldCreateFilled2x2Square = (occupied, x, y) => {
  for (let anchorX = x - 1; anchorX <= x; anchorX += 1) {
    for (let anchorY = y - 1; anchorY <= y; anchorY += 1) {
      let filled = true;
      for (let xOffset = 0; xOffset <= 1; xOffset += 1) {
        for (let yOffset = 0; yOffset <= 1; yOffset += 1) {
          const squareX = anchorX + xOffset;
          const squareY = anchorY + yOffset;
          const occupiedByCandidate = squareX === x && squareY === y;
          if (!occupiedByCandidate && !occupied.has(toCoordinateKey(squareX, squareY))) {
            filled = false;
            break;
          }
        }
        if (!filled) break;
      }

      if (filled) return true;
    }
  }

  return false;
};

const hasFilled2x2Square = (occupied) => {
  for (const coordinateKey of occupied) {
    const [rawX, rawY] = coordinateKey.split(",");
    const x = Number(rawX);
    const y = Number(rawY);
    if (
      occupied.has(toCoordinateKey(x + 1, y)) &&
      occupied.has(toCoordinateKey(x, y + 1)) &&
      occupied.has(toCoordinateKey(x + 1, y + 1))
    ) {
      return true;
    }
  }

  return false;
};

const canPlaceCoordinateByAroundConstraint = (
  { occupied, aroundCountByCoordinate },
  x,
  y,
  maxAroundNeighbors,
  maxStairRun,
) => {
  const key = toCoordinateKey(x, y);
  if (occupied.has(key)) return false;
  if (wouldCreateFilled2x2Square(occupied, x, y)) return false;

  const aroundCount = countOccupiedNeighbors(occupied, x, y, toAroundNeighbors8);
  if (aroundCount > maxAroundNeighbors) return false;

  for (const neighbor of toAroundNeighbors8(x, y)) {
    const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
    if (!occupied.has(neighborKey)) continue;

    const neighborAroundCount = aroundCountByCoordinate.get(neighborKey) ?? 0;
    if (neighborAroundCount + 1 > maxAroundNeighbors) return false;
  }

  if (maxStairRun > 0) {
    const diagonalPatternMetrics = toDiagonalPatternMetricsAfterPlacement(occupied, x, y);
    if (diagonalPatternMetrics.maxStairRunLength > maxStairRun) {
      return false;
    }
  }

  return true;
};

const applyCoordinatePlacement = (state, x, y) => {
  const key = toCoordinateKey(x, y);
  const occupiedAroundNeighbors = [];
  for (const neighbor of toAroundNeighbors8(x, y)) {
    const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
    if (state.occupied.has(neighborKey)) {
      occupiedAroundNeighbors.push(neighborKey);
    }
  }

  const occupiedOrthogonalNeighbors = [];
  for (const neighbor of toOrthogonalNeighbors(x, y)) {
    const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
    if (state.occupied.has(neighborKey)) {
      occupiedOrthogonalNeighbors.push(neighborKey);
    }
  }

  state.occupied.add(key);
  state.aroundCountByCoordinate.set(key, occupiedAroundNeighbors.length);
  state.orthogonalCountByCoordinate.set(key, occupiedOrthogonalNeighbors.length);

  for (const neighborKey of occupiedAroundNeighbors) {
    state.aroundCountByCoordinate.set(
      neighborKey,
      (state.aroundCountByCoordinate.get(neighborKey) ?? 0) + 1,
    );
  }
  for (const neighborKey of occupiedOrthogonalNeighbors) {
    state.orthogonalCountByCoordinate.set(
      neighborKey,
      (state.orthogonalCountByCoordinate.get(neighborKey) ?? 0) + 1,
    );
  }
};

const applyCorePlacement = ({ state, tile, x, y, maxAroundNeighbors, maxStairRun }) => {
  if (!canPlaceCoordinateByAroundConstraint(state, x, y, maxAroundNeighbors, maxStairRun)) {
    return false;
  }

  applyCoordinatePlacement(state, x, y);
  const key = toCoordinateKey(x, y);
  state.frontier.delete(key);
  state.placements.push({ tile, x, y });

  for (const neighbor of toOrthogonalNeighbors(x, y)) {
    const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
    if (state.occupied.has(neighborKey)) continue;

    const existing = state.frontier.get(neighborKey);
    if (existing) {
      existing.adjacentOccupiedCount += 1;
      continue;
    }

    state.frontier.set(neighborKey, {
      x: neighbor.x,
      y: neighbor.y,
      adjacentOccupiedCount: 1,
    });
  }

  return true;
};

const toCoreGenerationState = () => ({
  occupied: new Set(),
  aroundCountByCoordinate: new Map(),
  orthogonalCountByCoordinate: new Map(),
  frontier: new Map(),
  placements: [],
});

const countPotentialOpenNeighbors = (state, x, y, maxAroundNeighbors, maxStairRun) => {
  let count = 0;
  for (const neighbor of toOrthogonalNeighbors(x, y)) {
    if (state.occupied.has(toCoordinateKey(neighbor.x, neighbor.y))) continue;

    if (
      canPlaceCoordinateByAroundConstraint(
        state,
        neighbor.x,
        neighbor.y,
        maxAroundNeighbors,
        maxStairRun,
      )
    ) {
      count += 1;
    }
  }

  return count;
};

const toExpansionCandidates = ({
  state,
  activeCell,
  maxAroundNeighbors,
  maxStairRun,
  turnBonus,
  straightPenalty,
  junctionBonusPerExtraOrthogonalNeighbor,
  openNeighborBonus,
  aroundCountPenalty,
  diagonalContactPenalty,
  stairLShapePenalty,
  stairContinuationPenalty,
}) => {
  const candidates = [];
  for (let directionIndex = 0; directionIndex < ORTHOGONAL_DIRECTIONS.length; directionIndex += 1) {
    const direction = ORTHOGONAL_DIRECTIONS[directionIndex];
    const directionId = ORTHOGONAL_DIRECTION_IDS[directionIndex];
    const x = activeCell.x + direction.x;
    const y = activeCell.y + direction.y;
    if (!canPlaceCoordinateByAroundConstraint(state, x, y, maxAroundNeighbors, maxStairRun)) {
      continue;
    }

    const diagonalPatternMetrics = toDiagonalPatternMetricsAfterPlacement(state.occupied, x, y);

    const orthogonalNeighborCount = countOccupiedNeighbors(state.occupied, x, y, toOrthogonalNeighbors);
    const aroundNeighborCount = countOccupiedNeighbors(state.occupied, x, y, toAroundNeighbors8);
    const openNeighborCount = countPotentialOpenNeighbors(state, x, y, maxAroundNeighbors, maxStairRun);

    let score = 0;
    if (activeCell.lastDirectionId) {
      if (activeCell.lastDirectionId === directionId) {
        score -= straightPenalty;
      } else {
        score += turnBonus;
      }
    }

    score += (orthogonalNeighborCount - 1) * junctionBonusPerExtraOrthogonalNeighbor;
    score += openNeighborCount * openNeighborBonus;
    score -= aroundNeighborCount * aroundCountPenalty;
    score -= diagonalPatternMetrics.diagonalNeighborCount * diagonalContactPenalty;
    score -= diagonalPatternMetrics.stairLShapeCount * stairLShapePenalty;
    score -= diagonalPatternMetrics.stairContinuationCount * stairContinuationPenalty;

    candidates.push({
      directionId,
      x,
      y,
      score,
      orthogonalNeighborCount,
    });
  }

  return candidates;
};

const pickWeightedCandidate = (candidates, rng, candidateWeightEpsilon) => {
  if (candidates.length === 1) return candidates[0];

  let minScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate.score < minScore) {
      minScore = candidate.score;
    }
  }

  const weights = candidates.map((candidate) => candidate.score - minScore + candidateWeightEpsilon);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = toRandomValue(rng) * totalWeight;

  for (let index = 0; index < candidates.length; index += 1) {
    remaining -= weights[index];
    if (remaining <= 0) {
      return candidates[index];
    }
  }

  return candidates[candidates.length - 1];
};

const selectActiveCellIndex = (activeCells, rng, activeCellSelectNewestProbability) => {
  if (activeCells.length === 1) return 0;

  if (toRandomValue(rng) < activeCellSelectNewestProbability) {
    return activeCells.length - 1;
  }

  return toRandomIndex(activeCells.length, rng);
};

const hasExpansionCandidates = (state, activeCell, maxAroundNeighbors, maxStairRun) => {
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    const x = activeCell.x + direction.x;
    const y = activeCell.y + direction.y;
    if (canPlaceCoordinateByAroundConstraint(state, x, y, maxAroundNeighbors, maxStairRun)) {
      return true;
    }
  }

  return false;
};

const removeActiveCell = (activeCells, activeCell) => {
  const index = activeCells.indexOf(activeCell);
  if (index >= 0) {
    activeCells.splice(index, 1);
  }
};

const toCorePlacements = ({
  coreTiles,
  rng,
  maxAroundNeighbors,
  maxStairRun,
  activeCellSelectNewestProbability,
  loopInjectionChance,
  turnBonus,
  straightPenalty,
  junctionBonusPerExtraOrthogonalNeighbor,
  openNeighborBonus,
  aroundCountPenalty,
  diagonalContactPenalty,
  stairLShapePenalty,
  stairContinuationPenalty,
  candidateWeightEpsilon,
}) => {
  const state = toCoreGenerationState();
  if (
    !applyCorePlacement({
      state,
      tile: coreTiles[0],
      x: ORIGIN_X,
      y: ORIGIN_Y,
      maxAroundNeighbors,
      maxStairRun,
    })
  ) {
    return null;
  }

  const activeCells = [
    {
      x: ORIGIN_X,
      y: ORIGIN_Y,
      lastDirectionId: null,
    },
  ];

  while (state.placements.length < coreTiles.length) {
    if (activeCells.length === 0) {
      return null;
    }

    const selectedIndex = selectActiveCellIndex(
      activeCells,
      rng,
      activeCellSelectNewestProbability,
    );
    const activeCell = activeCells[selectedIndex];
    const candidates = toExpansionCandidates({
      state,
      activeCell,
      maxAroundNeighbors,
      maxStairRun,
      turnBonus,
      straightPenalty,
      junctionBonusPerExtraOrthogonalNeighbor,
      openNeighborBonus,
      aroundCountPenalty,
      diagonalContactPenalty,
      stairLShapePenalty,
      stairContinuationPenalty,
    });
    if (candidates.length === 0) {
      activeCells.splice(selectedIndex, 1);
      continue;
    }

    const loopCandidates = candidates.filter(
      (candidate) => candidate.orthogonalNeighborCount >= MIN_ORTHOGONAL_NEIGHBORS_FOR_LOOP,
    );
    const candidatePool =
      loopCandidates.length > 0 && toRandomValue(rng) < loopInjectionChance
        ? loopCandidates
        : candidates;
    const chosenCandidate = pickWeightedCandidate(candidatePool, rng, candidateWeightEpsilon);
    const nextTile = coreTiles[state.placements.length];

    if (
      !applyCorePlacement({
        state,
        tile: nextTile,
        x: chosenCandidate.x,
        y: chosenCandidate.y,
        maxAroundNeighbors,
        maxStairRun,
      })
    ) {
      continue;
    }

    activeCell.lastDirectionId = chosenCandidate.directionId;
    const placedActiveCell = {
      x: chosenCandidate.x,
      y: chosenCandidate.y,
      lastDirectionId: chosenCandidate.directionId,
    };
    activeCells.push(placedActiveCell);

    if (!hasExpansionCandidates(state, placedActiveCell, maxAroundNeighbors, maxStairRun)) {
      removeActiveCell(activeCells, placedActiveCell);
    }
    if (!hasExpansionCandidates(state, activeCell, maxAroundNeighbors, maxStairRun)) {
      removeActiveCell(activeCells, activeCell);
    }
  }

  return state;
};

const placeEdgeCoordinate = (edgeState, x, y, maxAroundNeighbors, maxStairRun) => {
  if (!canPlaceCoordinateByAroundConstraint(edgeState, x, y, maxAroundNeighbors, maxStairRun)) {
    return null;
  }

  const occupied = new Set(edgeState.occupied);
  const aroundCountByCoordinate = new Map(edgeState.aroundCountByCoordinate);
  const key = toCoordinateKey(x, y);
  const occupiedAroundNeighborKeys = [];
  for (const neighbor of toAroundNeighbors8(x, y)) {
    const neighborKey = toCoordinateKey(neighbor.x, neighbor.y);
    if (occupied.has(neighborKey)) {
      occupiedAroundNeighborKeys.push(neighborKey);
    }
  }

  occupied.add(key);
  aroundCountByCoordinate.set(key, occupiedAroundNeighborKeys.length);
  for (const neighborKey of occupiedAroundNeighborKeys) {
    aroundCountByCoordinate.set(neighborKey, (aroundCountByCoordinate.get(neighborKey) ?? 0) + 1);
  }

  return { occupied, aroundCountByCoordinate };
};

const selectEdgePlacements = ({ coreState, edgeTiles, rng, maxAroundNeighbors, maxStairRun }) => {
  if (edgeTiles.length === 0) return [];

  const leafFrontierCoordinates = Array.from(coreState.frontier.values()).filter(
    (coordinate) => coordinate.adjacentOccupiedCount === 1,
  );
  if (leafFrontierCoordinates.length < edgeTiles.length) {
    return null;
  }

  const recurse = (index, edgeState, selectedPlacements, candidates) => {
    if (index === edgeTiles.length) {
      return selectedPlacements;
    }

    const remainingRequired = edgeTiles.length - index;
    if (candidates.length < remainingRequired) {
      return null;
    }

    const orderedCandidates = shuffle(candidates, rng);
    for (let candidateIndex = 0; candidateIndex < orderedCandidates.length; candidateIndex += 1) {
      const candidate = orderedCandidates[candidateIndex];
      if (selectedPlacements.some((placement) => isOrthogonallyAdjacent(placement, candidate))) {
        continue;
      }

      const nextEdgeState = placeEdgeCoordinate(
        edgeState,
        candidate.x,
        candidate.y,
        maxAroundNeighbors,
        maxStairRun,
      );
      if (!nextEdgeState) continue;

      const nextSelectedPlacements = [
        ...selectedPlacements,
        {
          tile: edgeTiles[index],
          x: candidate.x,
          y: candidate.y,
        },
      ];
      const nextCandidates = orderedCandidates
        .slice(candidateIndex + 1)
        .filter((coordinate) => !isOrthogonallyAdjacent(coordinate, candidate));
      const result = recurse(index + 1, nextEdgeState, nextSelectedPlacements, nextCandidates);
      if (result) return result;
    }

    return null;
  };

  return recurse(
    0,
    {
      occupied: new Set(coreState.occupied),
      aroundCountByCoordinate: new Map(coreState.aroundCountByCoordinate),
    },
    [],
    leafFrontierCoordinates,
  );
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

const isValidFinalLayout = (placements, maxAroundNeighbors) => {
  const coordinates = placements.map(({ x, y }) => ({ x, y }));
  const occupied = new Set(coordinates.map(({ x, y }) => toCoordinateKey(x, y)));
  if (hasFilled2x2Square(occupied)) return false;

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
    if (aroundCount > maxAroundNeighbors) {
      return false;
    }
  }

  return true;
};

const buildAttemptPlacements = ({
  coreTiles,
  edgeTiles,
  rng,
  maxAroundNeighbors,
  maxStairRun,
  activeCellSelectNewestProbability,
  loopInjectionChance,
  turnBonus,
  straightPenalty,
  junctionBonusPerExtraOrthogonalNeighbor,
  openNeighborBonus,
  aroundCountPenalty,
  diagonalContactPenalty,
  stairLShapePenalty,
  stairContinuationPenalty,
  candidateWeightEpsilon,
}) => {
  const coreState = toCorePlacements({
    coreTiles,
    rng,
    maxAroundNeighbors,
    maxStairRun,
    activeCellSelectNewestProbability,
    loopInjectionChance,
    turnBonus,
    straightPenalty,
    junctionBonusPerExtraOrthogonalNeighbor,
    openNeighborBonus,
    aroundCountPenalty,
    diagonalContactPenalty,
    stairLShapePenalty,
    stairContinuationPenalty,
    candidateWeightEpsilon,
  });
  if (!coreState) return null;

  const edgePlacements = selectEdgePlacements({
    coreState,
    edgeTiles,
    rng,
    maxAroundNeighbors,
    maxStairRun,
  });
  if (!edgePlacements) return null;

  const placements = [...coreState.placements, ...edgePlacements];
  return isValidFinalLayout(placements, maxAroundNeighbors) ? placements : null;
};

export class GrowingTreeLooped extends LayerPlacementGenerator {
  /**
   * @param {object} [options]
   * @param {Function} [options.rng] Random function in [0,1); controls layout entropy.
   * @param {number} [options.maxAttempts] Retry budget; higher improves success probability.
   * @param {number} [options.maxAroundNeighbors] 8-neighbor density cap; higher allows denser packing.
   * @param {number} [options.activeCellSelectNewestProbability] Growth style mix: newest vs random active cell.
   * @param {number} [options.loopInjectionChance] Chance to prefer loop/junction-forming candidates.
   * @param {number} [options.turnBonus] Reward for changing direction.
   * @param {number} [options.straightPenalty] Penalty for continuing same direction.
   * @param {number} [options.junctionBonusPerExtraOrthogonalNeighbor] Reward for extra orthogonal contacts.
   * @param {number} [options.openNeighborBonus] Reward for preserving future legal expansion.
   * @param {number} [options.aroundCountPenalty] Penalty for local crowding in 8-neighborhood.
   * @param {number} [options.diagonalContactPenalty] Penalty for diagonal contact creation.
   * @param {number} [options.stairLShapePenalty] Penalty for creating 3-of-4 windows (stair steps).
   * @param {number} [options.stairContinuationPenalty] Extra penalty for extending stair chains.
   * @param {number} [options.maxStairRun] Optional hard cap for stair-run length (0 disables hard cap).
   * @param {number} [options.candidateWeightEpsilon] Randomization floor in weighted candidate sampling.
   */
  constructor({
    rng = Math.random,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    maxAroundNeighbors = DEFAULT_MAX_AROUND_NEIGHBORS,
    activeCellSelectNewestProbability = ACTIVE_CELL_SELECT_NEWEST_PROBABILITY,
    loopInjectionChance = LOOP_INJECTION_CHANCE,
    turnBonus = TURN_BONUS,
    straightPenalty = STRAIGHT_PENALTY,
    junctionBonusPerExtraOrthogonalNeighbor = JUNCTION_BONUS_PER_EXTRA_ORTHOGONAL_NEIGHBOR,
    openNeighborBonus = OPEN_NEIGHBOR_BONUS,
    aroundCountPenalty = AROUND_COUNT_PENALTY,
    diagonalContactPenalty = DIAGONAL_CONTACT_PENALTY,
    stairLShapePenalty = STAIR_L_SHAPE_PENALTY,
    stairContinuationPenalty = STAIR_CONTINUATION_PENALTY,
    maxStairRun = MAX_STAIR_RUN,
    candidateWeightEpsilon = CANDIDATE_WEIGHT_EPSILON,
  } = {}) {
    super();
    assertType(rng, Function, "rng", "GrowingTreeLooped");
    assertInteger(maxAttempts, "maxAttempts", "GrowingTreeLooped");
    assertInteger(maxAroundNeighbors, "maxAroundNeighbors", "GrowingTreeLooped");
    assertProbability(
      activeCellSelectNewestProbability,
      "activeCellSelectNewestProbability",
      "GrowingTreeLooped",
    );
    assertProbability(loopInjectionChance, "loopInjectionChance", "GrowingTreeLooped");
    assertFiniteNumber(turnBonus, "turnBonus", "GrowingTreeLooped");
    assertFiniteNumber(straightPenalty, "straightPenalty", "GrowingTreeLooped");
    assertFiniteNumber(
      junctionBonusPerExtraOrthogonalNeighbor,
      "junctionBonusPerExtraOrthogonalNeighbor",
      "GrowingTreeLooped",
    );
    assertFiniteNumber(openNeighborBonus, "openNeighborBonus", "GrowingTreeLooped");
    assertFiniteNumber(aroundCountPenalty, "aroundCountPenalty", "GrowingTreeLooped");
    assertFiniteNumber(diagonalContactPenalty, "diagonalContactPenalty", "GrowingTreeLooped");
    assertFiniteNumber(stairLShapePenalty, "stairLShapePenalty", "GrowingTreeLooped");
    assertFiniteNumber(stairContinuationPenalty, "stairContinuationPenalty", "GrowingTreeLooped");
    assertInteger(maxStairRun, "maxStairRun", "GrowingTreeLooped");
    assertFiniteNumber(candidateWeightEpsilon, "candidateWeightEpsilon", "GrowingTreeLooped");

    if (maxAttempts < 1) {
      throw new Error(`Invalid GrowingTreeLooped maxAttempts: ${maxAttempts}. Expected >= 1.`);
    }
    if (maxAroundNeighbors < 0 || maxAroundNeighbors > MAX_AROUND_NEIGHBORS_LIMIT) {
      throw new Error(
        `Invalid GrowingTreeLooped maxAroundNeighbors: ${maxAroundNeighbors}. ` +
          `Expected in [0, ${MAX_AROUND_NEIGHBORS_LIMIT}].`,
      );
    }
    if (candidateWeightEpsilon <= 0) {
      throw new Error(
        `Invalid GrowingTreeLooped candidateWeightEpsilon: ${candidateWeightEpsilon}. Expected > 0.`,
      );
    }
    if (diagonalContactPenalty < 0) {
      throw new Error(
        `Invalid GrowingTreeLooped diagonalContactPenalty: ${diagonalContactPenalty}. Expected >= 0.`,
      );
    }
    if (stairLShapePenalty < 0) {
      throw new Error(
        `Invalid GrowingTreeLooped stairLShapePenalty: ${stairLShapePenalty}. Expected >= 0.`,
      );
    }
    if (stairContinuationPenalty < 0) {
      throw new Error(
        `Invalid GrowingTreeLooped stairContinuationPenalty: ${stairContinuationPenalty}. Expected >= 0.`,
      );
    }
    if (maxStairRun < 0) {
      throw new Error(`Invalid GrowingTreeLooped maxStairRun: ${maxStairRun}. Expected >= 0.`);
    }

    this.rng = rng;
    this.maxAttempts = maxAttempts;
    this.maxAroundNeighbors = maxAroundNeighbors;
    this.activeCellSelectNewestProbability = activeCellSelectNewestProbability;
    this.loopInjectionChance = loopInjectionChance;
    this.turnBonus = turnBonus;
    this.straightPenalty = straightPenalty;
    this.junctionBonusPerExtraOrthogonalNeighbor = junctionBonusPerExtraOrthogonalNeighbor;
    this.openNeighborBonus = openNeighborBonus;
    this.aroundCountPenalty = aroundCountPenalty;
    this.diagonalContactPenalty = diagonalContactPenalty;
    this.stairLShapePenalty = stairLShapePenalty;
    this.stairContinuationPenalty = stairContinuationPenalty;
    this.maxStairRun = maxStairRun;
    this.candidateWeightEpsilon = candidateWeightEpsilon;
    Object.freeze(this);
  }

  generate({ tiles }) {
    assertType(tiles, Array, "tiles", "GrowingTreeLooped");
    if (tiles.length < 2) {
      throw new Error("GrowingTreeLooped requires at least 2 tiles for adjacency constraints.");
    }

    const { entrances, insideTiles, edgeTiles } = toTilePartitions(tiles);
    if (entrances.length === 0) {
      throw new Error("GrowingTreeLooped requires at least one Entrance tile.");
    }

    const anchorEntrance = entrances[0];
    const additionalEntrances = entrances.slice(1);
    const coreTiles = [anchorEntrance, ...insideTiles, ...additionalEntrances];

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const placements = buildAttemptPlacements({
        coreTiles,
        edgeTiles,
        rng: this.rng,
        maxAroundNeighbors: this.maxAroundNeighbors,
        activeCellSelectNewestProbability: this.activeCellSelectNewestProbability,
        loopInjectionChance: this.loopInjectionChance,
        turnBonus: this.turnBonus,
        straightPenalty: this.straightPenalty,
        junctionBonusPerExtraOrthogonalNeighbor: this.junctionBonusPerExtraOrthogonalNeighbor,
        openNeighborBonus: this.openNeighborBonus,
        aroundCountPenalty: this.aroundCountPenalty,
        diagonalContactPenalty: this.diagonalContactPenalty,
        stairLShapePenalty: this.stairLShapePenalty,
        stairContinuationPenalty: this.stairContinuationPenalty,
        maxStairRun: this.maxStairRun,
        candidateWeightEpsilon: this.candidateWeightEpsilon,
      });
      if (placements) return placements;
    }

    throw new Error(
      `GrowingTreeLooped failed after ${this.maxAttempts} attempts. ` +
        `Constraints unsatisfied for ${tiles.length} tiles (${edgeTiles.length} edge tiles).`,
    );
  }
}
