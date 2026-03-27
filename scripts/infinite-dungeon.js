import { registerCardsContextMenu } from "./presentation/index.js";

const MODULE_ID = "infinite-dungeon";

Hooks.once("init", () => {
  registerCardsContextMenu();
  console.log(`${MODULE_ID} | Initializing ${game.modules.get(MODULE_ID)?.title ?? MODULE_ID}`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
