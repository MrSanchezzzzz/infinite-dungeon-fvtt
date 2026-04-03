export const TileVisitState = Object.freeze({
  Unvisited: "unvisited",
  Occupied: "occupied",
  Visited: "visited",
});

const TILE_VISIT_STATE_SET = new Set(Object.values(TileVisitState));

export const isTileVisitState = (value) => TILE_VISIT_STATE_SET.has(value);

export const normalizeTileVisitState = (value) =>
  isTileVisitState(value) ? value : TileVisitState.Unvisited;
