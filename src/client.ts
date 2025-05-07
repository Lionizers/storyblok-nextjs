///<reference types="next/types/global" />
import StoryblokClient, { ISbStoriesParams } from "storyblok-js-client";
import { getContentTypeTag, getIndexTag, getPageTag } from "./tags";

export function createStoryblokClient(publicToken?: string) {
  const client = new StoryblokClient({
    accessToken: publicToken,
    cache: {
      // Don't use the in-memory cache of the Storybook client
      type: "none",
    },
    rateLimit: 25,
    // maxRetries: 10,
    async fetch(input, init) {
      const url = new URL(String(input));
      const next: NextFetchRequestConfig = {};

      const draft = url.searchParams.has("version", "draft");
      const dynamic = draft || url.searchParams.has("search_term");
      const forceCache = url.searchParams.has("cv", "-1");

      if (dynamic && !forceCache) {
        // Bypass the Next.js data cache in preview mode
        next.revalidate = 0;
      } else {
        // Cache indefinitely and tag for later invalidation ...
        next.revalidate = false;
        next.tags = [];

        // Extract the story path and use it as tag
        const match = /cdn\/stories\/(.+)$/.exec(url.pathname);
        if (match) {
          const [, storySlug] = match;
          next.tags.push(getPageTag(storySlug));
        }

        const contentType = url.searchParams.get("content_type");
        if (contentType) {
          next.tags.push(getContentTypeTag(contentType));
        }

        // Also use the `by_slugs` parameter for tagging
        const bySlugs = url.searchParams.get("by_slugs");
        if (bySlugs) {
          const slugs = bySlugs.split(",");
          for (const slug of slugs) {
            if (!slug.includes("*")) {
              next.tags.push(getPageTag(slug));
            }
          }
        }

        // Use the `by_slugs` parameter as _index tag_ if it contains a wildcard
        const startsWith = url.searchParams.get("by_slugs");
        if (startsWith?.includes("*")) {
          for (const slug of startsWith.split(",")) {
            next.tags.push(getIndexTag(slug.replace("/*", "")));
          }
        }
      }

      // Remove the cv parameter (content version) so that we always get the
      // latest version.
      url.searchParams.delete("cv");
      const res = await fetch(url, { ...init, next });
      if (!res.ok) {
        console.warn(`Storyblok API response status ${res.status}`);
      }
      return res;
    },
  });

  patchClient(client);
  return client;
}

/**
 * Monkey-patch the client to clear the cv after each request. Otherwise any previously passed cv
 * parameter would be used for subsequent requests.
 */
//eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchClient(client: any) {
  const cacheResponse = client.cacheResponse;
  client.cacheResponse = async (
    url: string,
    params: ISbStoriesParams,
    retries?: number
  ) => {
    const res = await cacheResponse.call(client, url, params, retries);
    if (params.token) {
      delete client.cacheVersions()[params.token];
    }
    return res;
  };
}
