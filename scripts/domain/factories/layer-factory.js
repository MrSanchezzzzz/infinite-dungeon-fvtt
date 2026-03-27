import { assertInteger, assertString, assertType } from "../../core/utils.js";
import { LayerPlacementGenerator } from "./layer-placement-generator.js";
import { Layer } from "../entities/layer.js";
import { PositionedTile, Tile } from "../entities/tile.js";

const toTilesArray = (tiles) => {
  if (!tiles || typeof tiles[Symbol.iterator] !== "function") {
    throw new Error("Invalid tiles: expected an iterable of Tile instances.");
  }

  const tilesArray = [];
  const seenTiles = new Set();
  for (const tile of tiles) {
    assertType(tile, Tile, "tile", "layer factory");

    if (tile instanceof PositionedTile) {
      throw new Error("Invalid tile: expected non-positioned Tile instances.");
    }

    if (seenTiles.has(tile)) {
      throw new Error("Invalid tiles: duplicate tile instance in layer factory input.");
    }

    seenTiles.add(tile);
    tilesArray.push(tile);
  }

  return tilesArray;
};

const toPlacementsArray = (generator, context) => {
  const placements = generator.generate(context);
  if (!placements || typeof placements[Symbol.iterator] !== "function") {
    throw new Error("Invalid layer placements: expected an iterable of placement records.");
  }

  return [...placements];
};

const toPositionedTilesMap = (tiles, placements) => {
  const tilesByX = new Map();
  const expectedTiles = new Set(tiles);
  const placedTiles = new Set();

  for (const placement of placements) {
    assertType(placement, Object, "placement", "layer factory");
    const { tile, x, y } = placement;
    assertType(tile, Tile, "placement tile", "layer factory");
    assertInteger(x, "x", "placement");
    assertInteger(y, "y", "placement");

    if (!expectedTiles.has(tile)) {
      throw new Error("Invalid placement tile: not found in layer factory input tiles.");
    }

    if (placedTiles.has(tile)) {
      throw new Error("Invalid layer placements: duplicate tile placement.");
    }

    placedTiles.add(tile);

    const positionedTile = new PositionedTile(tile.positionRule, tile.type, x, y);
    if (!tilesByX.has(x)) {
      tilesByX.set(x, new Map());
    }

    const tilesByY = tilesByX.get(x);
    if (tilesByY.has(y)) {
      throw new Error(`Position generator produced duplicate coordinates: (${x}, ${y}).`);
    }

    tilesByY.set(y, positionedTile);
  }

  if (placedTiles.size !== expectedTiles.size) {
    const missingCount = tiles.length - placedTiles.size;
    throw new Error(`Invalid layer placements: missing placements for ${missingCount} tiles.`);
  }

  return tilesByX;
};

export class LayerFactory {
  constructor(generator) {
    assertType(generator, LayerPlacementGenerator, "generator", "layer factory");
    this.generator = generator;
    Object.freeze(this);
  }

  create(name, depth, tiles) {
    assertString(name, "name", "layer");
    assertInteger(depth, "depth", "layer");

    const tilesArray = toTilesArray(tiles);
    const placements = toPlacementsArray(this.generator, {
      name,
      depth,
      tiles: tilesArray,
    });
    const positionedTiles = toPositionedTilesMap(tilesArray, placements);

    return new Layer(depth, name, positionedTiles);
  }
}
