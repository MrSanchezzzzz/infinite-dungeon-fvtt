import { TILES_DECK_ID } from "../predefined-deck.js";

const IDENTITY_FLAG_SCOPE = "infinite-dungeon";

const getCardsDocumentClass = () => getDocumentClass("Cards");

export const isPredefinedTilesDeck = (deck) =>
  Boolean(deck && deck.type === "deck" && deck.getFlag(IDENTITY_FLAG_SCOPE, "id") === TILES_DECK_ID);

export const findTemplateCardByType = (sourceDeck, tileType) =>
  sourceDeck.cards.find((card) => {
    const tileFlag = card.getFlag(IDENTITY_FLAG_SCOPE, "tile");
    return tileFlag?.type === tileType || card.name === tileType;
  }) ?? null;

export const createHandFromDeck = async ({ sourceDeck, name }) => {
  const CardsDocument = getCardsDocumentClass();
  return CardsDocument.create({
    name,
    type: "hand",
    img: sourceDeck.img,
    width: sourceDeck.width,
    height: sourceDeck.height,
    ownership: { default: 0 },
    flags: {
      [IDENTITY_FLAG_SCOPE]: {
        sourceDeckId: sourceDeck.id,
      },
    },
  });
};

export const buildHandCardDataFromTemplate = ({
  templateCard,
  count,
  facedown,
  originDeckId,
  startSort = 0,
}) => {
  const template = templateCard.toObject();
  const { _id, _stats, ...cardBaseData } = template;

  return Array.from({ length: count }, (_value, index) => ({
    ...cardBaseData,
    drawn: true,
    origin: originDeckId,
    face: facedown ? null : 0,
    sort: startSort + index,
  }));
};

export const createCardsInHand = async ({ hand, cardsData }) => {
  if (!cardsData.length) return [];
  return hand.createEmbeddedDocuments("Card", cardsData);
};
