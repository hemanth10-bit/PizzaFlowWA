export const getApiUrl = (path: string): string => {
  try {
    // 1. Check window.location if available and valid
    if (typeof window !== "undefined" && window.location) {
      const href = window.location.href;
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        const parts = href.split("/");
        if (parts.length >= 3) {
          return `${parts[0]}//${parts[2]}${path}`;
        }
      }
      
      if (window.location.origin && window.location.origin !== "null" && (window.location.origin.startsWith("http://") || window.location.origin.startsWith("https://"))) {
        return `${window.location.origin}${path}`;
      }
    }

    // 2. Scan script tags in the DOM for loaded origins (handles sandboxed iframe / srcdoc extremely well)
    if (typeof document !== "undefined") {
      const scripts = document.getElementsByTagName("script");
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
          const parts = src.split("/");
          if (parts.length >= 3) {
            return `${parts[0]}//${parts[2]}${path}`;
          }
        }
      }

      // 3. Scan link tags in the DOM
      const links = document.getElementsByTagName("link");
      for (let i = 0; i < links.length; i++) {
        const href = links[i].href;
        if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
          const parts = href.split("/");
          if (parts.length >= 3) {
            return `${parts[0]}//${parts[2]}${path}`;
          }
        }
      }
    }
    
    // 4. Fallback to import.meta.url
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const url = new URL(import.meta.url);
      if (url.origin && url.origin !== "null" && (url.origin.startsWith("http://") || url.origin.startsWith("https://"))) {
        return `${url.origin}${path}`;
      }
    }
  } catch (e) {
    // Ignore errors and fall back
  }
  
  // 5. Ultimate fallback - relative path (may fail inside sandboxed iframes without HTTP origin)
  return path;
};

