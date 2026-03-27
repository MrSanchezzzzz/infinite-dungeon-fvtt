import { generateDungeonLevelAndPlaceOnCanvas } from "../../../application/index.js";
import { isPredefinedTilesDeck } from "../../../data/fvtt/repositories/index.js";
import { openGenerateDungeonLevelDialog } from "../dialogs/generate-dungeon-level-dialog.js";

const getDeckFromEntry = (app, entry) => {
  const sourceElement = entry instanceof HTMLElement ? entry : entry?.[0];
  const entryElement = sourceElement?.closest("[data-entry-id]");
  return app.collection.get(entryElement?.dataset?.entryId);
};

export const registerCardsContextMenu = () => {
  Hooks.on("getCardsContextOptions", (app, menuItems) => {
    menuItems.push({
      name: "Generate Dungeon level",
      icon: '<i class="fa-solid fa-dungeon"></i>',
      condition: (entry) => {
        if (!game.user.isGM) return false;
        const deck = getDeckFromEntry(app, entry);
        return isPredefinedTilesDeck(deck);
      },
      callback: async (entry) => {
        const sourceDeck = getDeckFromEntry(app, entry);
        if (!sourceDeck) return;

        await openGenerateDungeonLevelDialog({
          sourceDeck,
          onSubmit: async ({ sourceDeck: currentDeck, rawConfig }) => {
            const { hand, placedCardsCount } = await generateDungeonLevelAndPlaceOnCanvas({
              sourceDeck: currentDeck,
              rawConfig,
            });

            ui.notifications.info(
              `Generated hand "${hand.name}" (${hand.cards.size} cards) and placed ${placedCardsCount} cards on canvas.`,
            );
          },
        });
      },
    });
  });
};
