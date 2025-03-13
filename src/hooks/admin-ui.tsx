"use client";
import { useEffect, useRef } from "react";

import { loadScript } from "./load-script";

declare global {
  interface Window {
    STORYBLOK_PREVIEW_URL: string;
    satismeter: unknown;
  }
}

export function useAdminUI(space?: number | string, previewPath?: string) {
  // Make sure we only load once, even in dev mode when effect runs twice
  const loaded = useRef(false);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;

      // Skip the space listing and show the specified space instead...
      if (space) {
        const rewrite = (url: unknown) => {
          if (url === "#/me/spaces") {
            // Ideally we would just call `location.replace(dest)` but
            // this breaks when running inside Next's app router due to
            // `state` being null in that case. The workaround is to call
            // `replaceState()` and fire a synthetic event in the next tick:
            window.history.replaceState(
              {},
              "",
              `#/me/spaces/${space}/stories/0/0/index/0`
            );
            setTimeout(() => {
              window.dispatchEvent(
                new PopStateEvent("popstate", {
                  state: {
                    __NA: true, // Prevents Next.js from handling the event
                  },
                })
              );
            }, 0);
            return true;
          }
        };

        // Intercept window.history methods ...
        const originalReplaceState = window.history.replaceState;
        const originalPushState = window.history.pushState;

        window.history.replaceState = (data, _unused, url) => {
          if (!rewrite(url)) {
            originalReplaceState.call(window.history, data, _unused, url);
          }
        };
        window.history.pushState = (data, _unused, url) => {
          if (!rewrite(url)) {
            originalPushState.call(window.history, data, _unused, url);
          }
        };
      }

      if (previewPath) {
        // Set the preview URL to the current origin
        window.STORYBLOK_PREVIEW_URL = window.origin + previewPath;
      }

      // Storyblok uses www.satismeter.com to collect customer feedback but we
      // sometimes get `window.satismeter is undefined` errors in the console.
      // We define it to get rid of these occasional errors:
      window.satismeter = console.log;

      loadScript("https://app.storyblok.com/f/app-latest.js");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
