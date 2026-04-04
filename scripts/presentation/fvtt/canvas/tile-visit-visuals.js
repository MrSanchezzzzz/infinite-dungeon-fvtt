import { TileVisitState } from "../../../domain/index.js";
import {
  getInfiniteDungeonSceneCards,
  getTileVisitState,
  isInfiniteDungeonTileCard,
} from "../../../data/fvtt/repositories/index.js";

const OCCUPIED_BORDER_KEY = "__infiniteDungeonOccupiedBorder";
const VISITED_ALPHA_FACTOR = 0.5;
const OCCUPIED_BORDER_WIDTH = 6;
const OCCUPIED_BORDER_COLOR = 0xffd400;
const PATCH_FLAG = "__infiniteDungeonTileVisitVisualPatch";

const getDefaultMeshAlpha = (cardObject) => {
  const targetAlpha =
    typeof cardObject._getTargetAlpha === "function"
      ? cardObject._getTargetAlpha()
      : cardObject.alpha ?? 1;
  const hiddenMultiplier = cardObject.document?.hidden ? 0.5 : 1;
  return targetAlpha * hiddenMultiplier;
};

const getOccupiedBorder = (cardObject, createIfMissing = false) => {
  if (cardObject[OCCUPIED_BORDER_KEY]) return cardObject[OCCUPIED_BORDER_KEY];
  if (!createIfMissing || typeof PIXI?.Graphics !== "function") return null;

  const border = new PIXI.Graphics();
  border.eventMode = "none";
  border.visible = false;
  border.alpha = 1;
  cardObject.addChild(border);
  cardObject[OCCUPIED_BORDER_KEY] = border;
  return border;
};

const hideOccupiedBorder = (cardObject) => {
  const border = getOccupiedBorder(cardObject);
  if (!border) return;
  border.clear();
  border.visible = false;
};

const drawOccupiedBorder = (cardObject) => {
  const border = getOccupiedBorder(cardObject, true);
  const bounds = cardObject.frame?.bounds;
  if (!border || !bounds) return;

  border.clear();
  border.lineStyle({
    width: OCCUPIED_BORDER_WIDTH,
    color: OCCUPIED_BORDER_COLOR,
    join: PIXI.LINE_JOIN.ROUND,
    alignment: 0.5,
  });
  border.drawShape(bounds);
  border.visible = true;
  cardObject.addChild(border);
};

const VISUAL_EFFECT_BY_STATE = Object.freeze({
  [TileVisitState.Unvisited]: (cardObject) => {
    if (!cardObject?.mesh) return;
    cardObject.mesh.alpha = getDefaultMeshAlpha(cardObject);
    hideOccupiedBorder(cardObject);
  },
  [TileVisitState.Visited]: (cardObject) => {
    if (!cardObject?.mesh) return;
    cardObject.mesh.alpha = getDefaultMeshAlpha(cardObject) * VISITED_ALPHA_FACTOR;
    hideOccupiedBorder(cardObject);
  },
  [TileVisitState.Occupied]: (cardObject) => {
    if (!cardObject?.mesh) return;
    cardObject.mesh.alpha = getDefaultMeshAlpha(cardObject);
    drawOccupiedBorder(cardObject);
  },
});

export const applyTileVisitVisual = (cardObject, state) => {
  if (!cardObject?.mesh) return;
  const applyEffect = VISUAL_EFFECT_BY_STATE[state] ?? VISUAL_EFFECT_BY_STATE[TileVisitState.Unvisited];
  applyEffect(cardObject);
};

export const applyTileVisitVisualForCard = (card, sceneId = canvas.scene?.id) => {
  if (!isInfiniteDungeonTileCard(card)) return;
  if (!sceneId) return;

  const cardObject = card.canvasCard?.object;
  if (!cardObject) return;

  const state = getTileVisitState(card, sceneId);
  applyTileVisitVisual(cardObject, state);
};

export const applyTileVisitVisualsForScene = (sceneId = canvas.scene?.id) => {
  if (!sceneId) return;

  for (const card of getInfiniteDungeonSceneCards(sceneId)) {
    applyTileVisitVisualForCard(card, sceneId);
  }
};

const patchCardObjectRefreshMethod = (cardObjectPrototype, methodName) => {
  const originalMethod = cardObjectPrototype[methodName];
  cardObjectPrototype[methodName] = function (...args) {
    if (typeof originalMethod === "function") {
      originalMethod.call(this, ...args);
    }
    applyTileVisitVisualForCard(this.document?.card, this.scene?.id ?? canvas.scene?.id);
  };
};

export const registerTileVisitVisualPatches = () => {
  const CardObject = globalThis.ccm?.canvas?.CardObject;
  if (!CardObject?.prototype) return false;
  if (CardObject.prototype[PATCH_FLAG]) return true;

  patchCardObjectRefreshMethod(CardObject.prototype, "_refreshState");
  patchCardObjectRefreshMethod(CardObject.prototype, "_refreshFrame");

  CardObject.prototype[PATCH_FLAG] = true;
  return true;
};
