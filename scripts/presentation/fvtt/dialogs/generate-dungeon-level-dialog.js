import {
  PREDEFINED_TILE_COUNT_PRESETS,
  TILE_TYPES,
  normalizeDungeonLevelConfig,
} from "../../../domain/index.js";

const CUSTOM_PRESET_VALUE = "__custom__";
const PRESET_BY_NAME = Object.freeze(
  new Map(PREDEFINED_TILE_COUNT_PRESETS.map((preset) => [preset.name, preset])),
);
const NORMALIZED_PRESET_CONFIG_BY_NAME = Object.freeze(
  new Map(
    PREDEFINED_TILE_COUNT_PRESETS.map((preset) => [
      preset.name,
      normalizeDungeonLevelConfig(preset.toRawConfig()),
    ]),
  ),
);
const DEFAULT_PRESET = PREDEFINED_TILE_COUNT_PRESETS[0];

const readFormRawConfig = (form) =>
  TILE_TYPES.reduce((config, type) => {
    const countElement = form.elements[`count-${type}`];
    const facedownElement = form.elements[`facedown-${type}`];
    config[type] = Object.freeze({
      count: Number(countElement?.value ?? 0),
      facedown: Boolean(facedownElement?.checked),
    });
    return config;
  }, {});

const isNormalizedConfigEqual = (left, right) =>
  TILE_TYPES.every((type) => {
    const leftType = left[type];
    const rightType = right[type];
    return leftType.count === rightType.count && leftType.facedown === rightType.facedown;
  });

const applyPresetToForm = (form, preset) => {
  for (const type of TILE_TYPES) {
    const countElement = form.elements[`count-${type}`];
    const facedownElement = form.elements[`facedown-${type}`];
    if (countElement) {
      countElement.value = String(preset.getCount(type));
    }
    if (facedownElement) {
      facedownElement.checked = preset.isFacedown(type);
    }
  }
};

const syncPresetSelectionFromForm = (form) => {
  const selectElement = form.elements.preset;
  if (!selectElement) return;

  const currentConfig = normalizeDungeonLevelConfig(readFormRawConfig(form));
  const matchingPreset = PREDEFINED_TILE_COUNT_PRESETS.find((preset) =>
    isNormalizedConfigEqual(currentConfig, NORMALIZED_PRESET_CONFIG_BY_NAME.get(preset.name)));

  selectElement.value = matchingPreset?.name ?? CUSTOM_PRESET_VALUE;
};

const getDialogContent = () => {
  const presetOptions = PREDEFINED_TILE_COUNT_PRESETS.map(
    (preset) => `<option value="${preset.name}">${preset.name}</option>`,
  ).join("");

  const rows = TILE_TYPES.map((type) => {
    const countName = `count-${type}`;
    const facedownName = `facedown-${type}`;

    return `
      <tr>
        <td>${type}</td>
        <td><input type="number" name="${countName}" min="0" step="1" value="0" required></td>
        <td><input type="checkbox" name="${facedownName}"></td>
      </tr>
    `;
  }).join("");

  return `
    <p>Choose how many cards of each type to include in the generated hand.</p>
    <div class="form-group">
      <label>Preset</label>
      <select name="preset">
        ${presetOptions}
        <option value="${CUSTOM_PRESET_VALUE}">Custom</option>
      </select>
    </div>
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

const getRawConfigFromForm = (form) => readFormRawConfig(form);

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
    render: (event, dialog) => {
      const form = dialog.element?.querySelector("form");
      if (!form) return;

      const selectElement = form.elements.preset;
      if (DEFAULT_PRESET) {
        applyPresetToForm(form, DEFAULT_PRESET);
        if (selectElement) {
          selectElement.value = DEFAULT_PRESET.name;
        }
      } else if (selectElement) {
        selectElement.value = CUSTOM_PRESET_VALUE;
      }

      if (selectElement) {
        selectElement.addEventListener("change", () => {
          if (selectElement.value === CUSTOM_PRESET_VALUE) return;
          const preset = PRESET_BY_NAME.get(selectElement.value);
          if (!preset) return;

          applyPresetToForm(form, preset);
          syncPresetSelectionFromForm(form);
        });
      }

      for (const type of TILE_TYPES) {
        const countElement = form.elements[`count-${type}`];
        const facedownElement = form.elements[`facedown-${type}`];
        countElement?.addEventListener("input", () => syncPresetSelectionFromForm(form));
        facedownElement?.addEventListener("change", () => syncPresetSelectionFromForm(form));
      }
    },
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
