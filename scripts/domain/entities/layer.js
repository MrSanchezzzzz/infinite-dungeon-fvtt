import { PositionedTile } from "./tile.js";
import { assertInteger, assertString, assertType } from "../../core/utils.js";

const toTilesMapFromNestedMaps = (tilesByX) => {
  assertType(tilesByX, Map, "tiles", "layer");

  const normalizedTilesByX = new Map();
  for (const [x, tilesByY] of tilesByX.entries()) {
    assertInteger(x, "x", "layer tile key");
    assertType(tilesByY, Map, `tilesByY at x=${x}`, "layer");

    const normalizedTilesByY = new Map();
    for (const [y, tile] of tilesByY.entries()) {
      assertInteger(y, "y", "layer tile key");
      assertType(tile, PositionedTile, "tile", "layer");

      if (tile.x !== x || tile.y !== y) {
        throw new Error(
          `Layer tile coordinates mismatch at map key (${x}, ${y}): tile has (${tile.x}, ${tile.y}).`,
        );
      }

      normalizedTilesByY.set(y, tile);
    }

    normalizedTilesByX.set(x, normalizedTilesByY);
  }

  return normalizedTilesByX;
};

const toTilesMap = (tiles) => {
  if (tiles === undefined) return new Map();
  if (tiles instanceof Map) return toTilesMapFromNestedMaps(tiles);

  throw new Error("Invalid layer tiles: expected Map<number, Map<number, PositionedTile>>.");
};

export class Layer {
  constructor(depth, name, tiles = new Map()) {
    assertInteger(depth, "depth", "layer");
    assertString(name, "name", "layer");

    const tilesMap = toTilesMap(tiles);
    this.depth = depth;
    this.name = name;
    this.tiles = tilesMap;
    Object.freeze(this);
  }
}
