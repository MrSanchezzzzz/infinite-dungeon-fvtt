export const withRollback = async ({ action, rollback }) => {
  try {
    return await action();
  } catch (error) {
    await rollback(error);
    throw error;
  }
};
