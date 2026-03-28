import { PREDEFINED_TILE_DEFINITIONS, TilePositionRule, TileType } from "../../domain/index.js";
import { IDENTITY_FLAG_SCOPE, toModuleId } from "../../core/index.js";
import { DEFAULT_TILE_SIZE } from "./constants.js";
import { createFvttCardModel, DEFAULT_CARD_BACK_NAME } from "./models/index.js";

const ICONS_BASE_PATH = "modules/infinite-dungeon/assets/icons";
export const TILE_BACK_IMAGE = `${ICONS_BASE_PATH}/dungeon_tile_back.png`;
export const TILE_BACK_ALT_IMAGE = `${ICONS_BASE_PATH}/dungeon_tile_back_alt.jpg`;

const BACK_IMAGE_BY_POSITION_RULE = Object.freeze({
  [TilePositionRule.Entrance]: TILE_BACK_IMAGE,
  [TilePositionRule.Inside]: TILE_BACK_IMAGE,
  [TilePositionRule.Edges]: TILE_BACK_ALT_IMAGE,
});

const TILE_IMAGE_BY_TYPE = Object.freeze({
  [TileType.Entrance]: `${ICONS_BASE_PATH}/dungeon_tile_entrance.png`,
  [TileType.Battle]: `${ICONS_BASE_PATH}/dungeon_tile_battle.png`,
  [TileType.Elite]: `${ICONS_BASE_PATH}/dungeon_tile_elite.png`,
  [TileType.Boss]: `${ICONS_BASE_PATH}/dungeon_tile_boss.png`,
  [TileType.Relic]: `${ICONS_BASE_PATH}/dungeon_tile_relic.png`,
  [TileType.Change]: `${ICONS_BASE_PATH}/dungeon_tile_change.png`,
  [TileType.Shop]: `${ICONS_BASE_PATH}/dungeon_tile_shop.png`,
  [TileType.Event]: `${ICONS_BASE_PATH}/dungeon_tile_event.png`,
  [TileType.Challenge]: `${ICONS_BASE_PATH}/dungeon_tile_challenge.png`,
  [TileType.Rest]: `${ICONS_BASE_PATH}/dungeon_tile_rest.png`,
  [TileType.Forge]: `${ICONS_BASE_PATH}/dungeon_tile_forge.png`,
});

const toTypeIconImage = (type) => {
  const imagePath = TILE_IMAGE_BY_TYPE[type];
  if (!imagePath) throw new Error(`No image mapping found for tile type: ${type}`);
  return imagePath;
};
const toCardId = (index) => `tile${String(index + 1).padStart(12, "0")}`;
const toCardModuleId = (index) => toModuleId(`card-${String(index + 1).padStart(4, "0")}`);

export const PREDEFINED_FVTT_CARDS = Object.freeze(
  PREDEFINED_TILE_DEFINITIONS.map(({ type, positionRule }, index) => {
    const cardModuleId = toCardModuleId(index);
    return createFvttCardModel({
      // Foundry requires _id to be 16-character alphanumeric.
      _id: toCardId(index),
      name: type,
      description: "",
      type: "base",
      suit: "tile",
      value: index + 1,
      width: DEFAULT_TILE_SIZE.width,
      height: DEFAULT_TILE_SIZE.height,
      faces: [
        {
          name: type,
          text: "",
          img: toTypeIconImage(type),
        },
      ],
      back: {
        name: DEFAULT_CARD_BACK_NAME,
        text: "",
        img: BACK_IMAGE_BY_POSITION_RULE[positionRule],
      },
      face: 0,
      drawn: false,
      rotation: 0,
      sort: index,
      flags: {
        [IDENTITY_FLAG_SCOPE]: {
          id: cardModuleId,
          tile: {
            type,
            positionRule,
          },
        },
      },
    });
  }),
);
