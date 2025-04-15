"use client";

import Image, { ImageProps } from "next/image";
import { storyblokImageLoader } from "./image-loader";
import { Asset } from "./storyblok-types";
import { getImageProps } from "./assets";

export function StoryblokImage(props: ImageProps) {
  return <Image {...props} loader={storyblokImageLoader} />;
}

type AssetImageProps = {
  asset?: Asset;
  className?: string;
  aspect?: number;
  sizes?: string;
  fill?: boolean;
};

export function AssetImage({
  asset,
  aspect,
  fill,
  sizes,
  ...props
}: AssetImageProps) {
  if (!asset?.filename) return null;
  return (
    <StoryblokImage
      {...getImageProps(asset, { aspect, fill })}
      fill={fill}
      sizes={sizes}
      {...props}
    />
  );
}
