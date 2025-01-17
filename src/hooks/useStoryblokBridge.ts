/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  ISbComponentType,
  ISbStoryData,
  ISbStoryParams,
} from "storyblok-js-client";
import { is } from "type-assurance";

import { deepMerge, withCorsHeaders } from "..";
import { rewriteLink } from "../rewriteLinks";
import { isAsset, isBlock, isDocImage, Story } from "../types";
import { loadScript } from "./loadScript";

interface BridgeEvent<S extends ISbComponentType<string> = any> {
  action: BridgeEventType;
  event?: string;
  story?: ISbStoryData<S>;
  slug?: string;
  slugChanged?: boolean;
  storyId?: number;
  reload?: boolean;
}

type BridgeEventType =
  | "customEvent"
  | "published"
  | "input"
  | "change"
  | "unpublished"
  | "enterEditmode";
interface Bridge {
  pingEditor: (event: any) => void;
  isInEditor: () => boolean;
  enterEditmode: () => void;
  on: (
    eventType: BridgeEventType | BridgeEventType[],
    callback: (event?: BridgeEvent) => void
  ) => void;
}

interface BridgeConfig {
  resolveRelations?: string | string[];
  customParent?: string;
  preventClicks?: boolean;
  language?: string;
  resolveLinks?: "url" | "story" | "0" | "1" | "link";
}

declare global {
  interface Window {
    storyblok: Bridge | null;
  }
}

function bridgeConfigFromStoryParams({
  resolve_links,
  resolve_relations,
}: ISbStoryParams = {}): BridgeConfig {
  return {
    resolveLinks: resolve_links,
    resolveRelations: resolve_relations,
  };
}

function getCustomParent() {
  try {
    return window.top?.location.origin;
  } catch (err) {
    // different origin = no custom parent
  }
}

export function useStoryblokBridge(
  initialStory: Story,
  params?: ISbStoryParams
) {
  const [story, setStory] = useState(initialStory);
  if (
    typeof window !== "undefined" &&
    typeof window.storyblok === "undefined"
  ) {
    window.storyblok = null;
  }
  useEffect(() => {
    loadScript("https://app.storyblok.com/f/storyblok-v2-latest.js", {
      onload: () => {
        const bridge: Bridge = new window.StoryblokBridge({
          customParent: getCustomParent(),
          ...bridgeConfigFromStoryParams(params),
        });
        bridge.on(["input", "published", "change"], async (event) => {
          if (!event) return;
          if (event.action === "input" && event.story?.id == initialStory.id) {
            await mergeResolvedData(event.story, initialStory);
            setStory(event.story);
          } else if (
            (event.action === "change" || event.action === "published") &&
            event.storyId == initialStory.id
          ) {
            window.location.reload();
          }
        });
        window.storyblok = bridge;
      },
    });
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return story;
}

async function mergeResolvedData(value: unknown, initialStory: Story) {
  const { public_url_prefix, resolved_data } = initialStory;
  if (is(value, {})) {
    if (resolved_data) {
      if (isBlock(value)) {
        const cached = resolved_data[value._uid];
        if (is(cached, {})) {
          deepMerge(value, cached);
        }
      } else if (isAsset(value)) {
        const cached = await getSvg(resolved_data, value.id, value.filename);
        if (is(cached, {})) {
          deepMerge(value, cached);
        }
      } else if (isDocImage(value)) {
        const cached = await getSvg(
          resolved_data,
          value.attrs.id,
          value.attrs.src
        );
        if (is(cached, {})) {
          deepMerge(value.attrs, cached);
        }
      }
    }
    if (public_url_prefix) {
      rewriteLink(value, public_url_prefix);
    }
    await Promise.all(
      Object.values(value).map((v) => mergeResolvedData(v, initialStory))
    );
  } else if (is(value, [])) {
    await Promise.all(value.map((v) => mergeResolvedData(v, initialStory)));
  }
}

async function getSvg(
  resolved_data: Record<string, unknown>,
  id: string | number,
  src: string
) {
  let cached = resolved_data[id];
  if (!cached && src.endsWith(".svg")) {
    const svg = await (await fetch(withCorsHeaders(src))).text();
    cached = resolved_data[id] = { svg };
  }
  return cached;
}

export function getStoryblokBridge() {
  return typeof window !== "undefined" && "storyblok" in window
    ? window.storyblok
    : undefined;
}

export function isStoryblokPreview() {
  return getStoryblokBridge() !== undefined;
}
