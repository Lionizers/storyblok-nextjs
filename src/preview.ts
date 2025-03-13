import crypto from "crypto";

export function validatePreviewParams(
  params: URLSearchParams,
  previewToken: string
) {
  const spaceId = params.get("_storyblok_tk[space_id]");
  const timestamp = params.get("_storyblok_tk[timestamp]");
  const token = params.get("_storyblok_tk[token]");
  if (!isValidToken({ token, spaceId, timestamp, previewToken })) {
    throw new Error(`Invalid preview token: ${token}`);
  }
}

function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function isValidToken({
  token,
  spaceId,
  timestamp,
  previewToken,
}: {
  spaceId: string | null;
  token: string | null;
  timestamp: string | null;
  previewToken: string;
}) {
  const hash = sha1(`${spaceId}:${previewToken}:${timestamp}`);
  return (
    token == hash &&
    timestamp &&
    parseInt(timestamp) > Math.floor(Date.now() / 1000) - 3600
  );
}

export function createSlugToken(slug: string[], previewToken: string) {
  return sha1(`${previewToken}:${slug.join("/")}`);
}

export function validateSlugToken(
  token: string,
  slug: string[],
  previewToken: string
) {
  if (token !== createSlugToken(slug, previewToken)) {
    throw new Error("Invalid token.");
  }
}
