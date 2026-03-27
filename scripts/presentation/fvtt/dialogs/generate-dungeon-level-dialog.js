import { TileType } from "../../../domain/index.js";

const TILE_TYPES = Object.freeze(Object.values(TileType));
const DEFAULT_COUNT_BY_TYPE = Object.freeze({
  [TileType.Entrance]: 1,
  [TileType.Battle]: 0,
  [TileType.Elite]: 0,
  [TileType.Boss]: 1,
  [TileType.Relic]: 0,
  [TileType.Change]: 0,
  [TileType.Shop]: 0,
  [TileType.Event]: 0,
  [TileType.Challenge]: 0,
  [TileType.Rest]: 0,
  [TileType.Forge]: 0,
});

const getDialogContent = () => {
  const rows = TILE_TYPES.map((type) => {
    const countName = `count-${type}`;
    const facedownName = `facedown-${type}`;
    const defaultCount = DEFAULT_COUNT_BY_TYPE[type] ?? 0;

    return `
      <tr>
        <td>${type}</td>
        <td><input type="number" name="${countName}" min="0" step="1" value="${defaultCount}" required></td>
        <td><input type="checkbox" name="${facedownName}"></td>
      </tr>
    `;
  }).join("");

  return `
    <p>Choose how many cards of each type to include in the generated hand.</p>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Count</th>
          <th>Face Down</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const getRawConfigFromForm = (form) =>
  TILE_TYPES.reduce((config, type) => {
    const countElement = form.elements[`count-${type}`];
    const facedownElement = form.elements[`facedown-${type}`];
    config[type] = {
      count: Number(countElement?.value ?? 0),
      facedown: Boolean(facedownElement?.checked),
    };
    return config;
  }, {});

const toErrorMessage = (error) => {
  if (Array.isArray(error?.errors) && error.errors.length) {
    return error.errors.join(" ");
  }
  return error?.message ?? "Failed to generate dungeon level hand.";
};

export const openGenerateDungeonLevelDialog = async ({ sourceDeck, onSubmit }) =>
  foundry.applications.api.DialogV2.wait({
    window: {
      title: `Generate Dungeon level: ${sourceDeck.name}`,
    },
    form: {
      closeOnSubmit: false,
    },
    content: getDialogContent(),
    buttons: [
      {
        action: "submit",
        label: "Generate",
        icon: "fa-solid fa-wand-magic-sparkles",
        default: true,
        callback: async (event, button, dialog) => {
          const rawConfig = getRawConfigFromForm(button.form);

          try {
            await onSubmit({ sourceDeck, rawConfig });
            await dialog.close({ submitted: true });
            return true;
          } catch (error) {
            ui.notifications.error(toErrorMessage(error));
            return false;
          }
        },
      },
      {
        action: "cancel",
        label: "Cancel",
        icon: "fa-solid fa-xmark",
        callback: async (_event, _button, dialog) => {
          await dialog.close();
          return null;
        },
      },
    ],
    rejectClose: false,
  });
