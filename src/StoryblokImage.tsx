"use client";

import Image, { ImageProps } from "next/image";
import { storyblokImageLoader } from "./imageLoader";

export function StoryblokImage(props: ImageProps) {
  return <Image {...props} loader={storyblokImageLoader} />;
}
