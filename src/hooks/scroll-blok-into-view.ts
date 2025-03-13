import { useEffect } from "react";

import { isStoryblokPreview } from "./storyblok-bridge";

export function useScrollBlokIntoView() {
  useEffect(() => {
    if (!isStoryblokPreview()) return;
    const observer = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (
          mutation.target.parentElement?.id === "storyblok__overlay-menu" &&
          mutation.addedNodes.length &&
          mutation.addedNodes[0].nodeType === Node.TEXT_NODE
        ) {
          mutation.target.parentElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
    };
  }, []);
}
