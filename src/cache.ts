import crypto from "crypto";
import { is, assert } from "type-assurance";
import { StoryblokClient } from "@storyblok/react";
import { revalidateTag } from "next/cache";
import { getPageTags } from "./tags";
import { NextRequest } from "next/server";

async function getStories(sbClient: StoryblokClient, slug: string) {
  try {
    const { data } = await sbClient.getStories({
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
  sbClient: StoryblokClient,
  processTag: (tag: string) => string[] = (tag) => [tag]
) {
  assert(body, { action: String, full_slug: String });
  const slug = body.full_slug;

  const stories = await getStories(sbClient, slug);
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

export function verifySignature(
  secret: string,
  signature: string,
  payload: string
) {
  const hmac = crypto.createHmac("sha1", secret);
  const digest = Buffer.from(hmac.update(payload).digest("hex"));
  const checksum = Buffer.from(signature);
  return crypto.timingSafeEqual(digest, checksum);
}

export async function handleWebhookRequest(
  request: NextRequest,
  client: StoryblokClient,
  secret?: string
) {
  const payload = await request.text();
  const signature = request.headers.get("webhook-signature");
  if (signature && !secret) {
    throw Error("Missing secret");
  }
  if (secret && signature) {
    if (!verifySignature(secret, signature, payload)) {
      return new Response(null, {
        status: 401,
        statusText: "Invalid signature",
      });
    }
  }
  await invalidate(JSON.parse(payload), client);
  return Response.json({ ok: true });
}
