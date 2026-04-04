import { toggleOccupied, toggleVisited } from "../../../application/index.js";
import { CCM_MODULE_ID, MODULE_ID } from "../../../core/index.js";
import {
  getTileVisitState,
  isInfiniteDungeonTileCard,
} from "../../../data/fvtt/repositories/index.js";
import { TileVisitState } from "../../../domain/index.js";
import {
  applyTileVisitVisualForCard,
  applyTileVisitVisualsForScene,
  registerTileVisitVisualPatches,
} from "./tile-visit-visuals.js";

const CONTROL_CONTAINER_CLASS = "infinite-dungeon-tile-visit-controls";
const CONTROL_BUTTON_CLASS = "infinite-dungeon-tile-visit-button";
const CONTROL_ACTIVE_CLASS = "is-active";
const CONTROL_VISITED_ACTION = "infinite-dungeon-toggle-visited";
const CONTROL_OCCUPIED_ACTION = "infinite-dungeon-toggle-occupied";
const HUD_PATCH_FLAG = "__infiniteDungeonTileVisitHudPatch";

let hooksRegistered = false;

const notifyUpdateError = (error) => {
  console.error(`${MODULE_ID} | Failed to update tile visit state`, error);
  ui.notifications.error(game.i18n.localize("INFINITE_DUNGEON.TileVisit.UpdateFailed"));
};

const makeControlButton = ({ action, iconClass, tooltip, active, variant }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("control-icon", CONTROL_BUTTON_CLASS, variant);
  button.dataset.action = action;
  button.dataset.tooltip = tooltip;
  if (active) button.classList.add(CONTROL_ACTIVE_CLASS);

  const icon = document.createElement("i");
  icon.className = iconClass;
  button.append(icon);
  return button;
};

const removeTileVisitControls = (hudRoot) => {
  hudRoot.querySelector(`.${CONTROL_CONTAINER_CLASS}`)?.remove();
};

const rerenderHud = (hudApplication) => {
  if (typeof hudApplication.render === "function") {
    hudApplication.render();
  } else if (canvas.cards?.hud) {
    canvas.cards.hud.render();
  }
};

const bindToggleStateHandler = ({ button, toggleAction, card, sceneId, hudApplication }) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    void toggleAction(card, sceneId)
      .then(() => {
        applyTileVisitVisualForCard(card, sceneId);
        rerenderHud(hudApplication);
      })
      .catch(notifyUpdateError);
  });
};

const addTileVisitControls = (hudApplication) => {
  const hudRoot = hudApplication.element;
  if (!hudRoot) return;

  removeTileVisitControls(hudRoot);

  if (!game.user.isGM) return;

  const card = hudApplication.document?.card;
  const sceneId = hudApplication.object?.scene?.id ?? canvas.scene?.id;
  if (!sceneId || !isInfiniteDungeonTileCard(card)) return;

  const rightColumn = hudRoot.querySelector(".col.right");
  if (!rightColumn) return;

  const state = getTileVisitState(card, sceneId);
  const controlsContainer = document.createElement("div");
  controlsContainer.classList.add(CONTROL_CONTAINER_CLASS);

  const visitedButton = makeControlButton({
    action: CONTROL_VISITED_ACTION,
    iconClass: "fa-solid fa-check",
    tooltip: game.i18n.localize("INFINITE_DUNGEON.TileVisit.ToggleVisited"),
    active: state === TileVisitState.Visited,
    variant: `${CONTROL_BUTTON_CLASS}--visited`,
  });

  const occupiedButton = makeControlButton({
    action: CONTROL_OCCUPIED_ACTION,
    iconClass: "fa-solid fa-location-dot",
    tooltip: game.i18n.localize("INFINITE_DUNGEON.TileVisit.ToggleOccupied"),
    active: state === TileVisitState.Occupied,
    variant: `${CONTROL_BUTTON_CLASS}--occupied`,
  });

  bindToggleStateHandler({
    button: visitedButton,
    toggleAction: toggleVisited,
    card,
    sceneId,
    hudApplication,
  });
  bindToggleStateHandler({
    button: occupiedButton,
    toggleAction: toggleOccupied,
    card,
    sceneId,
    hudApplication,
  });

  controlsContainer.append(visitedButton, occupiedButton);
  rightColumn.append(controlsContainer);
};

const patchCardHudRender = () => {
  const CardHud = globalThis.ccm?.apps?.CardHud;
  if (!CardHud?.prototype) return false;
  if (CardHud.prototype[HUD_PATCH_FLAG]) return true;

  const originalOnRender = CardHud.prototype._onRender;
  CardHud.prototype._onRender = function (...args) {
    const renderResult =
      typeof originalOnRender === "function" ? originalOnRender.call(this, ...args) : undefined;
    Promise.resolve(renderResult).then(() => {
      addTileVisitControls(this);
    });
    return renderResult;
  };

  CardHud.prototype[HUD_PATCH_FLAG] = true;
  return true;
};

const onCanvasReady = () => {
  applyTileVisitVisualsForScene(canvas.scene?.id);
};

const onUpdateCard = (card) => {
  if (!isInfiniteDungeonTileCard(card)) return;

  const sceneId = canvas.scene?.id;
  if (!sceneId) return;
  if (!card.getFlag(CCM_MODULE_ID, sceneId)) return;

  applyTileVisitVisualForCard(card, sceneId);
};

export const registerTileVisitControls = () => {
  const hasHudPatch = patchCardHudRender();
  const hasVisualPatch = registerTileVisitVisualPatches();

  if (!hasHudPatch || !hasVisualPatch) {
    console.warn(`${MODULE_ID} | Unable to register tile visit controls because CCM APIs are unavailable.`);
    return;
  }

  if (!hooksRegistered) {
    Hooks.on("canvasReady", onCanvasReady);
    Hooks.on("updateCard", onUpdateCard);
    hooksRegistered = true;
  }

  if (canvas.scene) {
    applyTileVisitVisualsForScene(canvas.scene.id);
  }
};
