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
const ADVANCED_TOGGLE_SELECTOR = "[data-action='toggle-advanced']";
const ADVANCED_FIELDS_SELECTOR = "[data-role='advanced-fields']";
const CONTROLS_SCROLL_SELECTOR = ".infinite-dungeon-generate-content";
const FOOTER_CONTAINER_SELECTOR = ".dialog-buttons, .form-footer, .window-footer, footer, menu";
const ACTION_BUTTON_SELECTOR = "button[data-action], .dialog-buttons button, .form-footer button, .window-footer button, footer button, menu button";
const DIALOG_FIXED_WIDTH = 540;
const DIALOG_FIXED_HEIGHT = 620;

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

const applyFixedDialogSize = (dialog) => {
  const element = dialog.element;
  if (!element) return;

  const width = Math.min(DIALOG_FIXED_WIDTH, Math.max(320, window.innerWidth - 32));
  const height = Math.min(DIALOG_FIXED_HEIGHT, Math.max(320, window.innerHeight - 32));

  if (typeof dialog.setPosition === "function") {
    dialog.setPosition({ width, height });
  }

  element.style.overflow = "hidden";
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.maxHeight = `${height}px`;
};

const findDirectChildBySelector = (parentElement, selector) => {
  if (!(parentElement instanceof HTMLElement)) return null;

  for (const childElement of parentElement.children) {
    if (childElement instanceof HTMLElement && childElement.matches(selector)) {
      return childElement;
    }
  }

  return null;
};

const findFooterContainer = ({ form, windowContent }) => {
  const footerInForm = findDirectChildBySelector(form, FOOTER_CONTAINER_SELECTOR);
  if (footerInForm instanceof HTMLElement) return footerInForm;

  const footerInWindowContent = findDirectChildBySelector(windowContent, FOOTER_CONTAINER_SELECTOR);
  if (footerInWindowContent instanceof HTMLElement) return footerInWindowContent;

  const candidateButton =
    form.querySelector(ACTION_BUTTON_SELECTOR) ??
    (windowContent instanceof HTMLElement ? windowContent.querySelector(ACTION_BUTTON_SELECTOR) : null);

  if (!(candidateButton instanceof HTMLElement)) return null;

  const nestedFooter = candidateButton.closest(FOOTER_CONTAINER_SELECTOR);
  return nestedFooter instanceof HTMLElement ? nestedFooter : null;
};

const applyWindowContentLayout = (windowContent) => {
  if (!(windowContent instanceof HTMLElement)) return;

  windowContent.style.display = "flex";
  windowContent.style.flexDirection = "column";
  windowContent.style.minHeight = "0";
  windowContent.style.overflow = "hidden";
};

const applyFormLayout = (form) => {
  if (!(form instanceof HTMLElement)) return;

  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.flex = "1 1 auto";
  form.style.minHeight = "0";
  form.style.overflow = "hidden";
};

const applyControlsScrollContainerLayout = (controlsScrollContainer) => {
  if (!(controlsScrollContainer instanceof HTMLElement)) return;

  controlsScrollContainer.style.flex = "1 1 auto";
  controlsScrollContainer.style.minHeight = "0";
  controlsScrollContainer.style.overflowY = "auto";
};

const pinFooterContainer = (footerContainer) => {
  if (!(footerContainer instanceof HTMLElement)) return;

  footerContainer.style.marginTop = "auto";
  footerContainer.style.flex = "0 0 auto";
};

const syncControlsScrollHeight = ({ form, controlsScrollContainer, footerContainer }) => {
  if (!(form instanceof HTMLElement) || !(controlsScrollContainer instanceof HTMLElement)) return;

  const windowContent = form.closest(".window-content");
  const boundaryElement = windowContent instanceof HTMLElement ? windowContent : form;
  const boundaryRect = boundaryElement.getBoundingClientRect();
  const controlsRect = controlsScrollContainer.getBoundingClientRect();
  const controlsTopOffset = controlsRect.top - boundaryRect.top;
  const footerHeight = footerContainer instanceof HTMLElement
    ? footerContainer.getBoundingClientRect().height
    : 0;
  const verticalPadding = 36;
  const availableHeight = Math.floor(
    boundaryRect.height - controlsTopOffset - footerHeight - verticalPadding);

  if (availableHeight > 80) {
    controlsScrollContainer.style.height = `${availableHeight}px`;
    controlsScrollContainer.style.maxHeight = `${availableHeight}px`;
  } else {
    controlsScrollContainer.style.height = "";
    controlsScrollContainer.style.maxHeight = "";
  }

  controlsScrollContainer.style.minHeight = "0";
  controlsScrollContainer.style.overflowY = "auto";
};

const applyPinnedButtonsScrollableControlsLayout = (form) => {
  const windowContent = form.closest(".window-content");
  applyWindowContentLayout(windowContent);
  applyFormLayout(form);

  const controlsScrollContainer = form.querySelector(CONTROLS_SCROLL_SELECTOR);
  applyControlsScrollContainerLayout(controlsScrollContainer);

  const footerContainer = findFooterContainer({ form, windowContent });
  if (footerContainer instanceof HTMLElement) {
    pinFooterContainer(footerContainer);
    if (
      controlsScrollContainer instanceof HTMLElement &&
      controlsScrollContainer.contains(footerContainer)
    ) {
      footerContainer.style.position = "sticky";
      footerContainer.style.bottom = "0";
      footerContainer.style.zIndex = "1";
      footerContainer.style.background = "var(--color-bg, var(--color-bg-alt, inherit))";
    } else {
      footerContainer.style.position = "relative";
      footerContainer.style.zIndex = "1";
    }
  }

  return Object.freeze({
    controlsScrollContainer:
      controlsScrollContainer instanceof HTMLElement ? controlsScrollContainer : null,
    footerContainer,
    windowContent: windowContent instanceof HTMLElement ? windowContent : null,
  });
};

const syncPinnedLayout = ({ form, controlsScrollContainer, footerContainer, windowContent }) => {
  if (!(form instanceof HTMLElement)) return;

  applyWindowContentLayout(windowContent);
  applyFormLayout(form);

  if (footerContainer instanceof HTMLElement) {
    pinFooterContainer(footerContainer);
  }

  syncControlsScrollHeight({ form, controlsScrollContainer, footerContainer });
};

const getDialogContent = () => {
  const presetOptions = PREDEFINED_TILE_COUNT_PRESETS.map(
    (preset) => `<option value="${preset.name}">${preset.name}</option>`,
  ).join("");

  const getRows = (types) => types.map((type) => {
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
  const rows = getRows(TILE_TYPES);

  return `
    <div class="infinite-dungeon-generate-content">
      <p>Choose a preset for the generated hand.</p>
      <div class="form-group">
        <label>Preset</label>
        <select name="preset">
          ${presetOptions}
          <option value="${CUSTOM_PRESET_VALUE}">Custom</option>
        </select>
      </div>
      <div class="form-group">
        <a
          class="infinite-dungeon-advanced-toggle"
          data-action="toggle-advanced"
          role="button"
          aria-expanded="false"
        >
          Advanced
        </a>
      </div>
      <div class="infinite-dungeon-advanced-fields" data-role="advanced-fields" hidden>
        <table class="infinite-dungeon-tile-count-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Count</th>
              <th>Face Down</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
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
      dialog.element?.classList.add("infinite-dungeon-generate-dialog");
      form.classList.add("infinite-dungeon-generate-form");

      const advancedToggle = form.querySelector(ADVANCED_TOGGLE_SELECTOR);
      const advancedFields = form.querySelector(ADVANCED_FIELDS_SELECTOR);
      const pinnedLayout = applyPinnedButtonsScrollableControlsLayout(form);
      const setAdvancedVisibility = (isVisible) => {
        if (!advancedToggle || !advancedFields) return;
        advancedFields.hidden = !isVisible;
        advancedToggle.setAttribute("aria-expanded", String(isVisible));
        advancedToggle.textContent = isVisible ? "Hide advanced" : "Advanced";
      };
      setAdvancedVisibility(false);
      applyFixedDialogSize(dialog);
      requestAnimationFrame(() => syncPinnedLayout({ form, ...pinnedLayout }));
      advancedToggle?.addEventListener("click", (event) => {
        event.preventDefault();
        if (!advancedFields) return;
        const isNextVisible = advancedFields.hidden;
        setAdvancedVisibility(isNextVisible);
        requestAnimationFrame(() => {
          syncPinnedLayout({ form, ...pinnedLayout });
          if (isNextVisible && pinnedLayout.controlsScrollContainer) {
            const targetTop = Math.max(0, advancedFields.offsetTop - 8);
            pinnedLayout.controlsScrollContainer.scrollTop = targetTop;
          }
        });
      });

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
