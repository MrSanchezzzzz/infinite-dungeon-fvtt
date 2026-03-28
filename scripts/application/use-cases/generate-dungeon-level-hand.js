import {
  TILE_TYPES,
  assertValidDungeonLevelConfig,
} from "../../domain/index.js";
import * as cardsRepository from "../../data/fvtt/repositories/index.js";
import { withRollback } from "./with-rollback.js";

const toDefaultHandName = (sourceDeck) => `${sourceDeck.name} - Dungeon Level`;

export const generateDungeonLevelHand = async ({
  sourceDeck,
  rawConfig,
  handName,
  repository = cardsRepository,
}) => {
  const config = assertValidDungeonLevelConfig(rawConfig);
  const cardsData = [];

  for (const tileType of TILE_TYPES) {
    const { count, facedown } = config[tileType];
    if (!count) continue;

    const templateCard = repository.findTemplateCardByType(sourceDeck, tileType);
    if (!templateCard) {
      throw new Error(`Source deck is missing template card for type "${tileType}".`);
    }

    cardsData.push(
      ...repository.buildHandCardDataFromTemplate({
        templateCard,
        count,
        facedown,
        originDeckId: sourceDeck.id,
        startSort: cardsData.length,
      }),
    );
  }

  const hand = await repository.createHandFromDeck({
    sourceDeck,
    name: handName?.trim() || toDefaultHandName(sourceDeck),
  });

  await withRollback({
    action: () => repository.createCardsInHand({ hand, cardsData }),
    rollback: async () => {
      await hand.delete().catch(() => undefined);
    },
  });

  return hand;
};
