export const assertRequiredFields = (entityName, fields) => {
  for (const [fieldName, fieldValue] of fields) {
    if (!fieldValue) {
      throw new Error(`${entityName} requires ${fieldName}`);
    }
  }
};

export const freezeObject = (value = {}) => Object.freeze({ ...value });
export const freezeArray = (values = []) => Object.freeze([...values]);
