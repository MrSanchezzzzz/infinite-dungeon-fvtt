import { DEFAULT_TILE_SIZE } from "../constants.js";
import { assertRequiredFields, freezeArray, freezeObject } from "./model-utils.js";

const DEFAULT_DECK_TYPE = "deck";
const DEFAULT_DECK_ROTATION = 0;
const DEFAULT_DECK_DISPLAY_COUNT = true;
const DEFAULT_DECK_SORT = 0;
const DEFAULT_DECK_WIDTH = DEFAULT_TILE_SIZE.width;
const DEFAULT_DECK_HEIGHT = DEFAULT_TILE_SIZE.height;
const DEFAULT_DECK_FOLDER = null;
const DEFAULT_DECK_OWNERSHIP = freezeObject({
  default: 0,
});

export const createFvttDeckModel = ({
  _id,
  name,
  description = "",
  type = DEFAULT_DECK_TYPE,
  img,
  system = {},
  cards = [],
  width = DEFAULT_DECK_WIDTH,
  height = DEFAULT_DECK_HEIGHT,
  rotation = DEFAULT_DECK_ROTATION,
  displayCount = DEFAULT_DECK_DISPLAY_COUNT,
  folder = DEFAULT_DECK_FOLDER,
  sort = DEFAULT_DECK_SORT,
  ownership = DEFAULT_DECK_OWNERSHIP,
  flags = {},
}) => {
  assertRequiredFields("FVTT deck model", [
    ["_id", _id],
    ["name", name],
    ["img", img],
  ]);

  return Object.freeze({
    _id,
    name,
    description,
    type,
    img,
    system: freezeObject(system),
    cards: freezeArray(cards),
    width,
    height,
    rotation,
    displayCount,
    folder,
    sort,
    ownership: freezeObject(ownership),
    flags: freezeObject(flags),
  });
};
