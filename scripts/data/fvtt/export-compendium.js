import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREDEFINED_TILES_DECK } from "./predefined-deck.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../../..");
const COMPENDIUM_PATH = path.join(PROJECT_ROOT, "packs/infinite-dungeon-decks.db");

fs.mkdirSync(path.dirname(COMPENDIUM_PATH), { recursive: true });
fs.writeFileSync(COMPENDIUM_PATH, `${JSON.stringify(PREDEFINED_TILES_DECK)}\n`);

console.log(`Compendium exported: ${COMPENDIUM_PATH}`);
