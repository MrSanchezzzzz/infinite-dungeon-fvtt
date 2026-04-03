import { CCM_MODULE_ID, IDENTITY_FLAG_SCOPE } from "../../../core/index.js";
import { TileVisitState, isTileVisitState } from "../../../domain/index.js";

const TILE_FLAG_KEY = "tile";
const TILE_VISIT_STATE_BY_SCENE_FLAG_KEY = "tileVisitStateByScene";
const CCM_SCENE_COLLECTION_FLAG_KEY = "cardCollection";

const toSceneId = (sceneId) => sceneId ?? canvas.scene?.id ?? null;

const getTileVisitStateByScene = (card) => {
  const rawValue = card.getFlag(IDENTITY_FLAG_SCOPE, TILE_VISIT_STATE_BY_SCENE_FLAG_KEY);
  return rawValue && typeof rawValue === "object" ? rawValue : {};
};

export const isInfiniteDungeonTileCard = (card) =>
  Boolean(card && card.documentName === "Card" && card.getFlag(IDENTITY_FLAG_SCOPE, TILE_FLAG_KEY));

export const getTileVisitState = (card, sceneId = canvas.scene?.id) => {
  if (!isInfiniteDungeonTileCard(card)) return TileVisitState.Unvisited;

  const resolvedSceneId = toSceneId(sceneId);
  if (!resolvedSceneId) return TileVisitState.Unvisited;

  const stateByScene = getTileVisitStateByScene(card);
  const sceneState = stateByScene[resolvedSceneId];
  return isTileVisitState(sceneState) ? sceneState : TileVisitState.Unvisited;
};

export const setTileVisitState = async (
  card,
  sceneId = canvas.scene?.id,
  state = TileVisitState.Unvisited,
) => {
  if (!isInfiniteDungeonTileCard(card)) return card;

  const resolvedSceneId = toSceneId(sceneId);
  if (!resolvedSceneId) return card;

  const normalizedState = isTileVisitState(state) ? state : TileVisitState.Unvisited;
  const nextStateByScene = { ...getTileVisitStateByScene(card) };

  if (normalizedState === TileVisitState.Unvisited) {
    delete nextStateByScene[resolvedSceneId];
  } else {
    nextStateByScene[resolvedSceneId] = normalizedState;
  }

  if (Object.keys(nextStateByScene).length === 0) {
    return card.unsetFlag(IDENTITY_FLAG_SCOPE, TILE_VISIT_STATE_BY_SCENE_FLAG_KEY);
  }

  return card.setFlag(IDENTITY_FLAG_SCOPE, TILE_VISIT_STATE_BY_SCENE_FLAG_KEY, nextStateByScene);
};

export const getInfiniteDungeonSceneCards = (sceneId = canvas.scene?.id) => {
  const resolvedSceneId = toSceneId(sceneId);
  if (!resolvedSceneId) return [];

  const scene = game.scenes.get(resolvedSceneId);
  if (!scene) return [];

  const cardCollectionUuids = scene.getFlag(CCM_MODULE_ID, CCM_SCENE_COLLECTION_FLAG_KEY) ?? [];
  const sceneCards = [];

  for (const uuid of cardCollectionUuids) {
    const card = fromUuidSync(uuid);
    if (!isInfiniteDungeonTileCard(card)) continue;
    if (!card.getFlag(CCM_MODULE_ID, resolvedSceneId)) continue;
    sceneCards.push(card);
  }

  return sceneCards;
};

export const findOccupiedTileCard = (sceneId = canvas.scene?.id) => {
  for (const card of getInfiniteDungeonSceneCards(sceneId)) {
    if (getTileVisitState(card, sceneId) === TileVisitState.Occupied) {
      return card;
    }
  }

  return null;
};
