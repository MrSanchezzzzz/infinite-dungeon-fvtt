import { CCM_MODULE_ID } from "../../core/index.js";
import { TileVisitState } from "../../domain/index.js";
import {
  getInfiniteDungeonSceneCards,
  getTileVisitState,
  isInfiniteDungeonTileCard,
  setTileVisitState,
} from "../../data/fvtt/repositories/index.js";

const toActiveSceneId = (sceneId) => {
  const activeSceneId = canvas.scene?.id;
  if (!activeSceneId) return null;
  return sceneId ?? activeSceneId;
};

const warnNoActiveScene = () =>
  ui.notifications.warn(game.i18n.localize("INFINITE_DUNGEON.TileVisit.NoActiveScene"));

const warnTileNotOnScene = (card) =>
  ui.notifications.warn(
    game.i18n.format("INFINITE_DUNGEON.TileVisit.NotOnScene", {
      tile: card?.name ?? "Unknown",
    }),
  );

const assertActionableCard = (card, sceneId) => {
  const activeSceneId = canvas.scene?.id;
  if (!activeSceneId) {
    warnNoActiveScene();
    return false;
  }

  if (sceneId !== activeSceneId) {
    warnTileNotOnScene(card);
    return false;
  }

  if (!isInfiniteDungeonTileCard(card)) {
    return false;
  }

  if (!card.getFlag(CCM_MODULE_ID, sceneId)) {
    warnTileNotOnScene(card);
    return false;
  }

  return true;
};

export const toggleVisited = async (card, sceneId = canvas.scene?.id) => {
  const resolvedSceneId = toActiveSceneId(sceneId);
  if (!resolvedSceneId) {
    warnNoActiveScene();
    return false;
  }

  if (!assertActionableCard(card, resolvedSceneId)) return false;

  const currentState = getTileVisitState(card, resolvedSceneId);
  const nextState =
    currentState === TileVisitState.Visited ? TileVisitState.Unvisited : TileVisitState.Visited;
  await setTileVisitState(card, resolvedSceneId, nextState);
  return true;
};

export const setOccupied = async (card, sceneId = canvas.scene?.id) => {
  const resolvedSceneId = toActiveSceneId(sceneId);
  if (!resolvedSceneId) {
    warnNoActiveScene();
    return false;
  }

  if (!assertActionableCard(card, resolvedSceneId)) return false;

  for (const sceneCard of getInfiniteDungeonSceneCards(resolvedSceneId)) {
    if (sceneCard.id === card.id) continue;
    if (getTileVisitState(sceneCard, resolvedSceneId) !== TileVisitState.Occupied) continue;
    await setTileVisitState(sceneCard, resolvedSceneId, TileVisitState.Visited);
  }

  await setTileVisitState(card, resolvedSceneId, TileVisitState.Occupied);
  return true;
};

export const toggleOccupied = async (card, sceneId = canvas.scene?.id) => {
  const resolvedSceneId = toActiveSceneId(sceneId);
  if (!resolvedSceneId) {
    warnNoActiveScene();
    return false;
  }

  if (!assertActionableCard(card, resolvedSceneId)) return false;

  const currentState = getTileVisitState(card, resolvedSceneId);
  if (currentState === TileVisitState.Occupied) {
    await setTileVisitState(card, resolvedSceneId, TileVisitState.Visited);
    return true;
  }

  return setOccupied(card, resolvedSceneId);
};
