import { MODULE_ID } from "./module.js";

export const ID_PREFIX = `${MODULE_ID}-`;

export const toModuleId = (suffix) => `${ID_PREFIX}${suffix}`;
