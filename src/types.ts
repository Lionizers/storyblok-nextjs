import { ComponentPropsWithoutRef, FunctionComponent } from "react";
import { RichText, Story } from "./storyblok-types";
import { StoryLoader } from "./story-loader";
import { RenderOptions } from "storyblok-rich-text-react-renderer";
export { RenderOptions } from "storyblok-rich-text-react-renderer";

export interface PageParams {
  slug: string[];
  lang?: string;
}

export type SearchParams = { [key: string]: string | string[] | undefined };

export interface PageProps {
  params: Promise<PageParams>;
  searchParams?: Promise<SearchParams>;
}

export interface ResolverContext {
  story: Story;
  loader: StoryLoader;
  revalidate?: boolean;
}

export type Components = Record<string, FunctionComponent<any>>;

export type Resolvers<C extends Components> = {
  [K in keyof C]?: Resolver<C[K]>;
};

export type RichTextOptions = {
  customize?: (defaultOptions: RenderOptions) => RenderOptions;
  hoistImages?: boolean;
  inlineComponents?: boolean | RegExp;
  transform?: (node: RichText) => RichText;
};

type Resolver<C extends FunctionComponent> = (
  props: ComponentPropsWithoutRef<C>,
  context: ResolverContext,
  ancestors: unknown[]
) => Promise<void | Partial<ComponentPropsWithoutRef<C>>>;
