import { usePreventLinkClicks } from "./usePreventLinkClicks";
import { useScrollBlokIntoView } from "./useScrollBlokIntoView";
import { useStoryblokBridge } from "./useStoryblokBridge";

import type { ISbStoryParams } from "storyblok-js-client";
import type { Story } from "../types";

export function useStoryblok(initialStory: Story, params?: ISbStoryParams) {
  const story = useStoryblokBridge(initialStory, params);
  usePreventLinkClicks();
  useScrollBlokIntoView();
  return story;
}
