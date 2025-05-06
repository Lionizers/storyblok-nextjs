import { is } from "type-assurance";

import { Story, StoryLink } from "./storyblok-types";

/**
 * Returns a story's URL path from a DocLink.
 */
export function getDocLinkStoryPath(story: { url: string; full_slug: string }) {
  if (story.url === story.full_slug) {
    return story.full_slug;
  }

  const [_, ...rest] = story.full_slug.split("/").filter((p) => !!p);
  return joinPath(...rest);
}

/**
 * Returns a story's URL path for the Story. This will be the `path` - if it was configured,
 * the translated slug - if parts where localized or the `full_slug` as fallback.
 */
export function getStoryPath(story: Story) {
  let path = story.path;
  if (path) return path;
  const defaultFullSlug = story.default_full_slug;
  if (defaultFullSlug) {
    if (
      is(story, {
        lang: String,
        translated_slugs: [{ lang: String, path: String, published: true }],
      })
    ) {
      path = story.translated_slugs.find((i) => i.lang === story.lang)?.path;
    }
    return path ?? defaultFullSlug;
  }
  return story.lang == "default"
    ? story.full_slug
    : removeFirstFolder(story.full_slug);
}

/**
 * Returns a story's URL path from a StoryLink. Depending on how `resolve_links`
 * was set when loading the story, the URL path is taken from different places.
 * See: https://www.storyblok.com/faq/link-object-history
 */
export function getStoryLinkPath(value: StoryLink) {
  if (!value.id) {
    // no story selected
    return;
  }
  if (is(value, { story: { url: String } })) {
    if (value.story.url) {
      // loaded with resolve_links = "url"
      return value.story.url;
    }
  } else if (value.story) {
    // loaded with resolve_links = "story"
    return getStoryPath(value.story);
  }
  // loaded without resolve_links
  return value.cached_url;
}

/**
 * Strip starting slash if it exists
 */
export const stripStartingSlash = (path: string) => path.replace(/^\//, "");

/**
 * Strip ending slash if it exists
 */
export const stripEndingSlash = (path: string) => path.replace(/\/$/, "");

/**
 * Adds a starting slash if it doesn't exist
 */
export function addStartingSlash(path?: string) {
  if (!path) return "/";
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

export function removeFirstFolder(slug: string) {
  const parts = stripStartingSlash(slug).split("/");
  return parts.slice(1).join("/");
}

export function removeLastFolder(slug: string) {
  const parts = stripEndingSlash(slug).split("/");
  return parts.slice(0, -1).join("/");
}

/**
 * Joins two or more paths, avoiding duplicate slashes.
 */
export function joinPath(...parts: Array<string | undefined>) {
  // Filter out undefined or empty strings
  const filteredParts = parts.filter(Boolean);
  if (filteredParts.length === 0) {
    return "";
  }
  // Handle the protocol if it exists in the first part
  if (filteredParts[0]!.includes("://")) {
    const [protocol, rest] = filteredParts[0]!.split("://");
    // Reconstruct the path by manually adding '://' and the rest of the joined parts
    const path = `${protocol}://${rest}/${filteredParts.slice(1).join("/")}`;
    // Ensure we don't introduce redundant slashes after the protocol
    return path.replace(/\/{2,}/g, "/").replace(/:\//, "://");
  }
  return filteredParts.join("/").replace(/\/{2,}/g, "/");
}

export function extendUrl(
  href: string,
  prefix?: string,
  params?: URLSearchParams
) {
  const url = new URL(joinPath(prefix, href), "file://");
  if (params) {
    params.forEach((value, name) => {
      url.searchParams.set(name, value);
    });
  }
  return url.pathname + url.search;
}

export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
) {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (is(value, {}) && !Array.isArray(value) && is(existing, {})) {
      deepMerge(existing, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
