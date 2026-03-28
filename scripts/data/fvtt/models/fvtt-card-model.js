import { DEFAULT_TILE_SIZE } from "../constants.js";
import { assertRequiredFields, freezeArray, freezeObject } from "./model-utils.js";

const DEFAULT_CARD_TYPE = "base";
const DEFAULT_CARD_FACE_INDEX = 0;
const DEFAULT_CARD_DRAWN = false;
const DEFAULT_CARD_ROTATION = 0;
const DEFAULT_CARD_WIDTH = DEFAULT_TILE_SIZE.width;
const DEFAULT_CARD_HEIGHT = DEFAULT_TILE_SIZE.height;
const DEFAULT_CARD_SUIT = "";
const DEFAULT_CARD_VALUE = 0;
const DEFAULT_CARD_SORT = 0;
export const DEFAULT_CARD_BACK_NAME = "Unknown";

export const createFvttCardFaceModel = ({ name = "", text = "", img = "" } = {}) =>
  Object.freeze({
    name,
    text,
    img,
  });

export const createFvttCardBackModel = ({ name = DEFAULT_CARD_BACK_NAME, text = "", img = "" } = {}) =>
  Object.freeze({
    name,
    text,
    img,
  });

export const createFvttCardModel = ({
  _id,
  name,
  description = "",
  type = DEFAULT_CARD_TYPE,
  system = {},
  suit = DEFAULT_CARD_SUIT,
  value = DEFAULT_CARD_VALUE,
  back,
  faces,
  face = DEFAULT_CARD_FACE_INDEX,
  drawn = DEFAULT_CARD_DRAWN,
  origin = null,
  width = DEFAULT_CARD_WIDTH,
  height = DEFAULT_CARD_HEIGHT,
  rotation = DEFAULT_CARD_ROTATION,
  sort = DEFAULT_CARD_SORT,
  flags = {},
}) => {
  assertRequiredFields("FVTT card model", [
    ["_id", _id],
    ["name", name],
  ]);
  if (!back?.img) throw new Error("FVTT card model requires back image");
  if (!Array.isArray(faces) || faces.length === 0) {
    throw new Error("FVTT card model requires at least one face");
  }

  return Object.freeze({
    _id,
    name,
    description,
    type,
    system: freezeObject(system),
    suit,
    value,
    back: createFvttCardBackModel(back),
    faces: freezeArray(faces.map((faceModel) => createFvttCardFaceModel(faceModel))),
    face,
    drawn,
    origin,
    width,
    height,
    rotation,
    sort,
    flags: freezeObject(flags),
  });
};
