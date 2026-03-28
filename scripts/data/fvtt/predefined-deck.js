import { PREDEFINED_FVTT_CARDS, TILE_BACK_IMAGE } from "./predefined-cards.js";
import { IDENTITY_FLAG_SCOPE, toModuleId } from "../../core/index.js";
import { DEFAULT_TILE_SIZE } from "./constants.js";
import { createFvttDeckModel } from "./models/index.js";

export const TILES_DECK_ID = toModuleId("deck-tiles");
const TILES_DECK_DOCUMENT_ID = "tilesdeck0000001";

export const PREDEFINED_TILES_DECK = createFvttDeckModel({
  // Foundry requires _id to be 16-character alphanumeric.
  _id: TILES_DECK_DOCUMENT_ID,
  name: "Tiles",
  description: "<p>Predefined Infinite Dungeon tile deck.</p>",
  type: "deck",
  img: TILE_BACK_IMAGE,
  system: {},
  cards: PREDEFINED_FVTT_CARDS,
  width: DEFAULT_TILE_SIZE.width,
  height: DEFAULT_TILE_SIZE.height,
  rotation: 0,
  displayCount: true,
  folder: null,
  sort: 0,
  ownership: {
    default: 0,
  },
  flags: {
    [IDENTITY_FLAG_SCOPE]: {
      id: TILES_DECK_ID,
      predefined: true,
    },
  },
});
