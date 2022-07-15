import { stat } from 'fs/promises';

export const exists = async (filename: string) => {
  try {
    await stat(filename);
  } catch (e) {
    return false;
  }

  return true;
};
