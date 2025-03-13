import { usePreventLinkClicks } from "./prevent-link-clicks";
import { useScrollBlokIntoView } from "./scroll-blok-into-view";
import { useStoryblokBridge } from "./storyblok-bridge";

import type { ISbStoryParams } from "storyblok-js-client";
import type { Story } from "../storyblok-types";

export function useStoryblok(initialStory: Story, params?: ISbStoryParams) {
  const story = useStoryblokBridge(initialStory, params);
  usePreventLinkClicks();
  useScrollBlokIntoView();
  return story;
}
