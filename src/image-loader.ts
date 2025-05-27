import { ImageLoaderProps } from "next/image";

import { getAssetDimensions } from "./assets";
import { joinPath } from "./helpers";

const ASSET_DOMAIN = process.env.NEXT_PUBLIC_ASSET_DOMAIN;

export function storyblokImageLoader(props: ImageLoaderProps) {
  const { src, width, quality } = props;
  const size = getAssetDimensions(src);
  if (size.unoptimized) return src;
  // Do not upscale images ...
  const w = Math.min(width, size?.width ?? width);

  // Crop if aspect ratio is specified as query param ...
  const url = new URL(src);
  const aspect = url.searchParams.get("aspect");
  const h = aspect ? Math.round(w / parseFloat(aspect)) : 0;
  return imageEngineURL(url, w, h, true, { quality });
}

export type ImageFilters = Record<
  string,
  string | number | boolean | null | undefined
>;

function filterString(opts: ImageFilters) {
  const s = Object.entries(opts)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === false) return "";
      return `:${key}(${value === true ? "" : value})`;
    })
    .join("");
  return s ? `filters${s}` : "";
}
export function imageEngineURL(
  url: URL,
  width: number,
  height: number,
  smart = true,
  filters?: ImageFilters
) {
  const parts = [url.pathname, "m", `${width}x${height}`];
  if (smart) parts.push("smart");
  if (filters) {
    const s = filterString(filters);
    if (s) parts.push(s);
  }
  return joinPath(ASSET_DOMAIN ?? url.origin, ...parts);
}
