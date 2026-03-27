const PRIMITIVE_TYPE_BY_CONSTRUCTOR = Object.freeze(
  new Map([
    [String, "string"],
    [Number, "number"],
    [Boolean, "boolean"],
    [BigInt, "bigint"],
    [Symbol, "symbol"],
    [Function, "function"],
  ]),
);

export const assertType = (value, type, name = "value", entity = "value") => {
  const primitiveType = PRIMITIVE_TYPE_BY_CONSTRUCTOR.get(type);
  const isValidType = primitiveType ? typeof value === primitiveType : value instanceof type;

  if (!isValidType) {
    throw new Error(`Invalid ${entity} ${name}: ${value}. Expected ${type.name}.`);
  }
};

export const assertInteger = (value, name, entity = "value") => {
  assertType(value, Number, name, entity);

  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${entity} ${name}: ${value}. Expected an integer.`);
  }
};

export const assertString = (value, name = "value", entity = "value") => {
  assertType(value, String, name, entity);

  if (value.trim().length === 0) {
    throw new Error(`Invalid ${entity} ${name}: ${value}. Expected a non-empty string.`);
  }
};
