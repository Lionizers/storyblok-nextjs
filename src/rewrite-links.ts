import { is } from "type-assurance";

import {
  extendUrl,
  getDocLinkStoryPath,
  getStoryLinkPath,
  getStoryPath,
} from "./helpers";
import {
  isRichTextStoryLink,
  isEmailLink,
  isStory,
  isStoryLink,
  isUrlLink,
  Story,
} from "./storyblok-types";

export function rewriteLinks(
  prefix: string | undefined,
  params: URLSearchParams | undefined,
  value: unknown
) {
  if (is(value, [])) {
    value.forEach((v) => rewriteLinks(prefix, params, v));
  } else if (is(value, {})) {
    rewriteLink(prefix, params, value);
    Object.values(value).forEach((v) => rewriteLinks(prefix, params, v));
  }
}

export function rewriteLink(
  prefix: string | undefined,
  params: URLSearchParams | undefined,
  value: unknown
) {
  if (isStoryLink(value)) {
    const path = getStoryLinkPath(value);
    if (path) value.public_url = extendUrl(path, prefix, params);
  } else if (isRichTextStoryLink(value)) {
    value.attrs.href = extendUrl(
      getDocLinkStoryPath(value.attrs.story),
      prefix,
      params
    );
  } else if (isStory(value)) {
    rewriteStoryLink(prefix, params, value as Story);
  } else if (isUrlLink(value)) {
    value.public_url = value.url;
  } else if (isEmailLink(value)) {
    value.public_url = `mailto:${value.email}`;
  }
}

export function rewriteStoryLink(
  prefix: string | undefined,
  params: URLSearchParams | undefined,
  value: Story
) {
  value.public_url = extendUrl(getStoryPath(value), prefix, params);
  return value as Story & { public_url: string };
}
