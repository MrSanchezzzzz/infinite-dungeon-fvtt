export class LayerPlacementGenerator {
  constructor() {
    if (new.target === LayerPlacementGenerator) {
      throw new Error("LayerPlacementGenerator is abstract and cannot be instantiated directly.");
    }
  }

  generate() {
    throw new Error(`${this.constructor.name} must implement generate({ name, depth, tiles }).`);
  }
}
