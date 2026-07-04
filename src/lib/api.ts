export const getApiUrl = (path: string): string => {
  try {
    if (typeof window !== "undefined" && window.location) {
      // 1. Try to extract origin from window.location.href (robust against null/sandboxed origins)
      const href = window.location.href;
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        const parts = href.split("/");
        if (parts.length >= 3) {
          const extractedOrigin = `${parts[0]}//${parts[2]}`;
          return `${extractedOrigin}${path}`;
        }
      }
      
      // 2. Fallback to standard window.location.origin
      if (window.location.origin && window.location.origin !== "null") {
        return `${window.location.origin}${path}`;
      }
    }
    
    // 3. Fallback to import.meta.url
    const url = new URL(import.meta.url);
    if (url.origin && url.origin !== "null") {
      return `${url.origin}${path}`;
    }
  } catch (e) {
    // Ignore errors and fall back
  }
  return path;
};
