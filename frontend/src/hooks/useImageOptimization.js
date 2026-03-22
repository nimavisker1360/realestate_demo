import { useEffect } from "react";

const applyImageAttributes = (image) => {
  if (!(image instanceof HTMLImageElement)) return;

  if (!image.getAttribute("loading")) {
    image.setAttribute("loading", "lazy");
  }

  if (!image.getAttribute("decoding")) {
    image.setAttribute("decoding", "async");
  }

  const setDimensions = () => {
    const rect = image.getBoundingClientRect();
    const renderedWidth = Math.round(rect.width || image.clientWidth || 0);
    const renderedHeight = Math.round(rect.height || image.clientHeight || 0);

    if (!image.getAttribute("width")) {
      const width = renderedWidth || Math.round(image.naturalWidth || 0);
      if (width > 0) image.setAttribute("width", String(width));
    }

    if (!image.getAttribute("height")) {
      const height = renderedHeight || Math.round(image.naturalHeight || 0);
      if (height > 0) image.setAttribute("height", String(height));
    }
  };

  setDimensions();
  if (!image.complete) {
    image.addEventListener("load", setDimensions, { once: true });
  }
};

const useImageOptimization = () => {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    document.querySelectorAll("img").forEach((image) => {
      applyImageAttributes(image);
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            applyImageAttributes(node);
            return;
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll("img").forEach((image) => {
              applyImageAttributes(image);
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
};

export default useImageOptimization;
