import { TileType } from "../entities/tile.js";

export class DungeonLevelValidationError extends Error {
  constructor(errors) {
    super("Dungeon level configuration is invalid.");
    this.name = "DungeonLevelValidationError";
    this.errors = errors;
  }
}

const REQUIRED_TYPES = Object.freeze([TileType.Entrance, TileType.Boss]);
const TILE_TYPES = Object.freeze(Object.values(TileType));

export const normalizeDungeonLevelConfig = (rawConfig = {}) =>
  TILE_TYPES.reduce((config, type) => {
    const rawTypeConfig = rawConfig[type] ?? {};
    const rawCount = Number(rawTypeConfig.count ?? 0);
    config[type] = Object.freeze({
      count: Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0,
      facedown: Boolean(rawTypeConfig.facedown),
    });
    return config;
  }, {});

export const validateDungeonLevelConfig = (rawConfig = {}) => {
  const config = normalizeDungeonLevelConfig(rawConfig);
  const errors = [];

  for (const type of TILE_TYPES) {
    const count = config[type].count;
    if (!Number.isInteger(count) || count < 0) {
      errors.push(`${type} count must be a non-negative integer.`);
    }
  }

  for (const requiredType of REQUIRED_TYPES) {
    if ((config[requiredType]?.count ?? 0) < 1) {
      errors.push(`${requiredType} count must be at least 1.`);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    config,
  });
};

export const assertValidDungeonLevelConfig = (rawConfig = {}) => {
  const result = validateDungeonLevelConfig(rawConfig);
  if (!result.valid) {
    throw new DungeonLevelValidationError(result.errors);
  }
  return result.config;
};
