import crypto from "crypto";

function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

export function validatePreviewParams(
  params: Record<string, unknown> | undefined,
  previewToken: string,
  maxAgeSeconds = 3600
) {
  if (!params) {
    throw new Error("Missing parameters.");
  }
  const spaceId = params["_storyblok_tk[space_id]"];
  const timestamp = params["_storyblok_tk[timestamp]"];
  const token = params["_storyblok_tk[token]"];
  if (!token) {
    throw new Error("Missing token.");
  }
  if (maxAgeSeconds > 0) {
    const t = typeof timestamp === "string" ? parseInt(timestamp) : 0;
    if (isNaN(t) || t < Math.floor(Date.now() / 1000) - maxAgeSeconds) {
      throw new Error("Token has expired.");
    }
  }
  if (token !== sha1(`${spaceId}:${previewToken}:${timestamp}`)) {
    throw new Error("Invalid token.");
  }
}
