import {
  TileType,
  assertValidDungeonLevelConfig,
} from "../../domain/index.js";
import * as cardsRepository from "../../data/fvtt/repositories/index.js";

const toDefaultHandName = (sourceDeck) => `${sourceDeck.name} - Dungeon Level`;

export const generateDungeonLevelHand = async ({
  sourceDeck,
  rawConfig,
  handName,
  repository = cardsRepository,
}) => {
  const config = assertValidDungeonLevelConfig(rawConfig);
  const cardsData = [];

  for (const tileType of Object.values(TileType)) {
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

  try {
    await repository.createCardsInHand({ hand, cardsData });
  } catch (error) {
    await hand.delete().catch(() => undefined);
    throw error;
  }

  return hand;
};
