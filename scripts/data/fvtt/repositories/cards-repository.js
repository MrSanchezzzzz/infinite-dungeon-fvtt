import { TILES_DECK_ID } from "../predefined-deck.js";

const IDENTITY_FLAG_SCOPE = "infinite-dungeon";
const CCM_MODULE_ID = "complete-card-management";

const getCardsDocumentClass = () => getDocumentClass("Cards");
const getTileTypeFromCard = (card) => {
  const tileFlag = card.getFlag(IDENTITY_FLAG_SCOPE, "tile");
  return tileFlag?.type || card.name || null;
};

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

export const assertCanvasPlacementAvailable = () => {
  if (!game.modules.get(CCM_MODULE_ID)?.active) {
    throw new Error('"complete-card-management" module must be active to place cards on canvas.');
  }

  if (!globalThis.ccm?.api?.placeCard || !globalThis.ccm?.api?.removeCard) {
    throw new Error("complete-card-management API is not available on this client.");
  }

  if (!canvas.scene) {
    throw new Error("You must be viewing a scene to place cards on canvas.");
  }
};

export const groupHandCardsByTileType = (hand) => {
  const cardsByType = new Map();

  for (const card of hand.cards) {
    const tileType = getTileTypeFromCard(card);
    if (!tileType) continue;

    const cards = cardsByType.get(tileType);
    if (cards) {
      cards.push(card);
      continue;
    }

    cardsByType.set(tileType, [card]);
  }

  return cardsByType;
};

export const placeCardOnCanvas = async ({ card, x, y, sceneId, rotation, sort }) =>
  globalThis.ccm.api.placeCard(card, { x, y, sceneId, rotation, sort });

export const removeCardFromCanvas = async ({ card }) => globalThis.ccm.api.removeCard(card);
