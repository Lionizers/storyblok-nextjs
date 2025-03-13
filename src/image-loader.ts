import { ImageLoaderProps } from "next/image";

import { getAssetDimensions } from "./assets";

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

  return `${url.origin}${url.pathname}/m/${w}x${h}${quality ? `/filters:quality(${quality})` : ""}`;
}
