"use client";

import Image, { ImageProps } from "next/image";
import { storyblokImageLoader } from "./image-loader";

export function StoryblokImage(props: ImageProps) {
  return <Image {...props} loader={storyblokImageLoader} />;
}
