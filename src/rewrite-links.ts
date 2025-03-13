import { is } from "type-assurance";

import {
  getDocLinkStoryPath,
  getStoryLinkPath,
  getStoryPath,
  joinPath,
} from "./helpers";
import {
  isRichTextStoryLink,
  isEmailLink,
  isStory,
  isStoryLink,
  isUrlLink,
  Story,
} from "./storyblok-types";

export function rewriteLinks(value: unknown, prefix: string) {
  if (is(value, [])) {
    value.forEach((v) => rewriteLinks(v, prefix));
  } else if (is(value, {})) {
    rewriteLink(value, prefix);
    Object.values(value).forEach((v) => rewriteLinks(v, prefix));
  }
}

export function rewriteLink(value: unknown, prefix: string) {
  if (isStoryLink(value)) {
    const path = getStoryLinkPath(value);
    if (path) value.public_url = joinPath("/", prefix, path);
  } else if (isRichTextStoryLink(value)) {
    value.attrs.href = joinPath(
      "/",
      prefix,
      getDocLinkStoryPath(value.attrs.story)
    );
  } else if (isStory(value)) {
    value.public_url = joinPath("/", prefix, getStoryPath(value as Story));
  } else if (isUrlLink(value)) {
    value.public_url = value.url;
  } else if (isEmailLink(value)) {
    value.public_url = `mailto:${value.email}`;
  }
}

export function rewriteStoryLink(value: Story, prefix: string) {
  value.public_url = joinPath("/", prefix, getStoryPath(value));
  return value as Story & { public_url: string };
}
