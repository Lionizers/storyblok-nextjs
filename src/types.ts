import { ComponentPropsWithoutRef, FunctionComponent } from "react";
import { StoriesParams, Story } from "./storyblok-types";
import { StoryblokClient } from "@storyblok/react";

export interface PageParams {
  lang?: string;
  slug: string[];
  token?: string;
}

export interface PageProps {
  params: Promise<PageParams>;
}

export interface ResolverContext {
  params: PageParams;
  story: Story;
  prefix: string;
  locale?: string;
  revalidate?: boolean;
  client: StoryblokClient;
  getStories: (storyParams: StoriesParams) => Promise<Story[]>;
}

export type Components = Record<string, FunctionComponent<any>>;

export type Resolvers<C extends Components> = {
  [K in keyof C]?: Resolver<C[K]>;
};

type Resolver<C extends FunctionComponent> = (
  props: ComponentPropsWithoutRef<C>,
  context: ResolverContext,
  ancestors: unknown[]
) => Promise<void | Partial<ComponentPropsWithoutRef<C>>>;
