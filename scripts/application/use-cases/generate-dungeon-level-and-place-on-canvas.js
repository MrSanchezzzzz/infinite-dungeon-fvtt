import {
  assertValidDungeonLevelConfig,
  FrontierGrowthClassic,
  LayerFactory,
  PREDEFINED_TILE_DEFINITIONS,
  Tile,
  TileType,
} from "../../domain/index.js";
import * as cardsRepository from "../../data/fvtt/repositories/index.js";
import { generateDungeonLevelHand } from "./generate-dungeon-level-hand.js";

const DEFAULT_LAYER_DEPTH = 0;
const POSITION_RULE_BY_TYPE = new Map(
  PREDEFINED_TILE_DEFINITIONS.map(({ type, positionRule }) => [type, positionRule]),
);

const toDefaultLayerName = (sourceDeck) => `${sourceDeck.name} - Dungeon Layer`;
const toCoordinates = (origin, spacing, tile) => ({
  x: origin.x + tile.x * spacing.x,
  y: origin.y + tile.y * spacing.y,
});

const assertFiniteNumber = (value, label) => {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label}: expected a finite number.`);
  }
};

const toTilesFromConfig = (config) => {
  const tiles = [];

  for (const tileType of Object.values(TileType)) {
    const positionRule = POSITION_RULE_BY_TYPE.get(tileType);
    if (!positionRule) {
      throw new Error(`No position rule mapping found for tile type "${tileType}".`);
    }

    const { count } = config[tileType];
    for (let index = 0; index < count; index += 1) {
      tiles.push(new Tile(positionRule, tileType));
    }
  }

  return tiles;
};

const toFlatPositionedTiles = (layer) => {
  const positionedTiles = [];

  for (const tilesByY of layer.tiles.values()) {
    for (const tile of tilesByY.values()) {
      positionedTiles.push(tile);
    }
  }

  return positionedTiles;
};

const takeCardByTileType = (cardsByType, tileType) => {
  const cards = cardsByType.get(tileType);
  if (!cards?.length) {
    throw new Error(`No generated hand card available for tile type "${tileType}".`);
  }

  return cards.shift();
};

const toOrigin = (origin) => {
  const { sceneX, sceneY, sceneWidth, sceneHeight } = canvas.scene.dimensions;
  const mergedOrigin = {
    x: sceneX + sceneWidth / 2,
    y: sceneY + sceneHeight / 2,
    ...origin,
  };

  assertFiniteNumber(mergedOrigin.x, "origin.x");
  assertFiniteNumber(mergedOrigin.y, "origin.y");
  return mergedOrigin;
};

const toSpacing = ({ sourceDeck, spacing }) => {
  const mergedSpacing = {
    x: canvas.grid.sizeX * (sourceDeck.width ?? 2),
    y: canvas.grid.sizeY * (sourceDeck.height ?? 3),
    ...spacing,
  };

  assertFiniteNumber(mergedSpacing.x, "spacing.x");
  assertFiniteNumber(mergedSpacing.y, "spacing.y");
  if (mergedSpacing.x <= 0 || mergedSpacing.y <= 0) {
    throw new Error("Invalid spacing: expected positive spacing values.");
  }

  return mergedSpacing;
};

const rollbackPlacedCards = async (placedCards, repository) => {
  for (const card of [...placedCards].reverse()) {
    await repository.removeCardFromCanvas({ card }).catch(() => undefined);
  }
};

export const generateDungeonLevelAndPlaceOnCanvas = async ({
  sourceDeck,
  rawConfig,
  handName,
  layerName,
  layerDepth = DEFAULT_LAYER_DEPTH,
  origin,
  spacing,
  repository = cardsRepository,
  layerFactory = new LayerFactory(new FrontierGrowthClassic()),
}) => {
  const config = assertValidDungeonLevelConfig(rawConfig);
  repository.assertCanvasPlacementAvailable();

  const tiles = toTilesFromConfig(config);
  const layer = layerFactory.create(
    layerName?.trim() || toDefaultLayerName(sourceDeck),
    layerDepth,
    tiles,
  );

  const hand = await generateDungeonLevelHand({
    sourceDeck,
    rawConfig: config,
    handName,
    repository,
  });

  const cardsByType = repository.groupHandCardsByTileType(hand);
  const positionedTiles = toFlatPositionedTiles(layer);
  const sceneId = canvas.scene.id;
  const resolvedOrigin = toOrigin(origin);
  const resolvedSpacing = toSpacing({ sourceDeck, spacing });
  const placedCards = [];

  try {
    for (const tile of positionedTiles) {
      const card = takeCardByTileType(cardsByType, tile.type);
      const { x, y } = toCoordinates(resolvedOrigin, resolvedSpacing, tile);

      await repository.placeCardOnCanvas({
        card,
        x,
        y,
        sceneId,
        sort: placedCards.length,
      });

      placedCards.push(card);
    }
  } catch (error) {
    await rollbackPlacedCards(placedCards, repository);
    await hand.delete().catch(() => undefined);
    throw error;
  }

  return { hand, layer, placedCardsCount: placedCards.length };
};
