import { is, assert } from "type-assurance";
import { StoryblokClient } from "@storyblok/react";
import { revalidateTag } from "next/cache";
import { getPageTags } from "./tags";

async function getStories(
  sbClient: StoryblokClient,
  slug: string,
  token: string
) {
  try {
    const { data } = await sbClient.getStories({
      token,
      starts_with: slug,
    });
    return data.stories;
  } catch (err: unknown) {
    if (is(err, { status: 404 })) {
      console.log("Stories not found:", slug, err);
    }
    throw err;
  }
}

export async function invalidate(
  body: unknown,
  token: string,
  sbClient: StoryblokClient,
  processTag: (tag: string) => string[] = (tag) => [tag]
) {
  assert(body, { action: String, full_slug: String });
  const slug = body.full_slug;

  const stories = await getStories(sbClient, slug, token);
  if (!stories.length) {
    console.warn(`Not revalidating - no stories found for slug ${slug}`);
    return Response.json({ ok: true });
  }

  const tags = new Set<string>();
  stories.flatMap(getPageTags).forEach((tag) => {
    processTag(tag).forEach((t) => tags.add(t));
  });
  for (const tag of tags.values()) {
    console.log("Revalidate '%s'", tag);
    revalidateTag(tag);
  }
}
