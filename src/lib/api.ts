export const getApiUrl = (path: string): string => {
  try {
    const url = new URL(import.meta.url);
    return `${url.origin}${path}`;
  } catch (e) {
    return path;
  }
};
