"use client";

import { ISbStoryParams } from "@storyblok/react";
import { useStoryblok } from "./hooks";
import { Story } from "./storyblok-types";
import { ComponentType } from "react";

export function ClientPage({
  story,
  params,
  BlockComponent,
}: {
  story: Story;
  params: ISbStoryParams;
  BlockComponent: ComponentType<any>;
}) {
  const previewStory = useStoryblok(story, params);
  return <BlockComponent {...previewStory.content} />;
}
