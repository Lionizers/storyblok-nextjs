import { useEffect } from "react";

import { isStoryblokPreview } from "./useStoryblokBridge";

export function usePreventLinkClicks() {
  useEffect(() => {
    if (!isStoryblokPreview()) return;
    const onClick = (e: MouseEvent) => {
      const isFrame = window !== window.top;
      if (isFrame && e.target instanceof Element) {
        const a = e.target.closest("a");
        //const ed = e.target.closest("[data-block-c]");
        if (a) e.preventDefault();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
