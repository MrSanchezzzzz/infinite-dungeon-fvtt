import { assertInteger, assertString, assertType } from "../../core/utils.js";
import { TileType } from "./tile.js";

const TILE_TYPES = Object.freeze(Object.values(TileType));

const toNormalizedCountByType = (countByType) => {
  assertType(countByType, Map, "countByType", "tile count preset");

  const normalized = new Map();
  for (const tileType of TILE_TYPES) {
    if (!countByType.has(tileType)) {
      throw new Error(`Tile count preset is missing count for tile type "${tileType}".`);
    }

    const count = countByType.get(tileType);
    assertInteger(count, `count for ${tileType}`, "tile count preset");
    if (count < 0) {
      throw new Error(`Invalid tile count preset count for "${tileType}": expected >= 0.`);
    }

    normalized.set(tileType, count);
  }

  return normalized;
};

const toNormalizedFacedownByType = (facedownByType) => {
  assertType(facedownByType, Map, "facedownByType", "tile count preset");

  const normalized = new Map();
  for (const tileType of TILE_TYPES) {
    if (!facedownByType.has(tileType)) {
      throw new Error(`Tile count preset is missing facedown value for tile type "${tileType}".`);
    }

    const facedown = facedownByType.get(tileType);
    assertType(facedown, Boolean, `facedown for ${tileType}`, "tile count preset");
    normalized.set(tileType, facedown);
  }

  return normalized;
};

export class TileCountPreset {
  constructor(name, countByType, facedownByType) {
    assertString(name, "name", "tile count preset");

    const normalizedCountByType = toNormalizedCountByType(countByType);
    const normalizedFacedownByType = toNormalizedFacedownByType(facedownByType);

    this.name = name.trim();
    this.countByType = normalizedCountByType;
    this.facedownByType = normalizedFacedownByType;
    Object.freeze(this);
  }

  getCount(tileType) {
    if (!this.countByType.has(tileType)) {
      throw new Error(`Tile count preset "${this.name}" does not define count for "${tileType}".`);
    }

    return this.countByType.get(tileType);
  }

  isFacedown(tileType) {
    if (!this.facedownByType.has(tileType)) {
      throw new Error(`Tile count preset "${this.name}" does not define facedown for "${tileType}".`);
    }

    return this.facedownByType.get(tileType);
  }

  toRawConfig() {
    return TILE_TYPES.reduce((rawConfig, tileType) => {
      rawConfig[tileType] = Object.freeze({
        count: this.getCount(tileType),
        facedown: this.isFacedown(tileType),
      });
      return rawConfig;
    }, {});
  }
}
