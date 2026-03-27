const DEFAULT_DECK_TYPE = "deck";
const DEFAULT_DECK_ROTATION = 0;
const DEFAULT_DECK_DISPLAY_COUNT = true;
const DEFAULT_DECK_SORT = 0;
const DEFAULT_DECK_WIDTH = 3;
const DEFAULT_DECK_HEIGHT = 3;
const DEFAULT_DECK_FOLDER = null;
const DEFAULT_DECK_OWNERSHIP = Object.freeze({
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
  if (!_id) throw new Error("FVTT deck model requires _id");
  if (!name) throw new Error("FVTT deck model requires name");
  if (!img) throw new Error("FVTT deck model requires img");

  return Object.freeze({
    _id,
    name,
    description,
    type,
    img,
    system: Object.freeze({ ...system }),
    cards: Object.freeze([...cards]),
    width,
    height,
    rotation,
    displayCount,
    folder,
    sort,
    ownership: Object.freeze({ ...ownership }),
    flags: Object.freeze({ ...flags }),
  });
};
