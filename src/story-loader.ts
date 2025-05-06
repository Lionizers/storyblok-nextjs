import { notFound, redirect } from "next/navigation";
import { StoryblokClient } from "@storyblok/react";
import {
  isApiError,
  StoriesParams,
  Story,
  StoryParams,
  StoryQueryParams,
} from "./storyblok-types";
import { ResolverContext, Resolvers } from "./types";
import { rewriteLinks } from "./rewrite-links";
import { resolveData } from "./resolve-data";

export interface StoryLoaderOptions {
  pageSlug: string;
  rootSlug: string;
  client: StoryblokClient;
  defaults: StoryQueryParams;
  dataResolvers: Resolvers<any>;
  hiddenPagePattern: RegExp;
  publicUrlPrefix?: string;
  previewParams?: URLSearchParams;
}

export class StoryLoader {
  protected pageSlug: string;
  protected rootSlug: string;
  protected client: StoryblokClient;
  protected defaults: StoryQueryParams;
  protected dataResolvers: Resolvers<any>;
  protected publicUrlPrefix: string | undefined;
  protected previewParams: URLSearchParams | undefined;
  protected hiddenPagePattern: RegExp;

  rewriteLinks: (value: unknown) => void;

  constructor({
    pageSlug,
    rootSlug,
    client,
    defaults,
    dataResolvers,
    publicUrlPrefix,
    previewParams,
    hiddenPagePattern,
  }: StoryLoaderOptions) {
    this.pageSlug = pageSlug;
    this.rootSlug = rootSlug;
    this.client = client;
    this.defaults = defaults;
    this.dataResolvers = dataResolvers;
    this.publicUrlPrefix = publicUrlPrefix;
    this.previewParams = previewParams;
    this.hiddenPagePattern = hiddenPagePattern;
    this.rewriteLinks = rewriteLinks.bind(null, publicUrlPrefix, previewParams);
  }

  async getPageStory() {
    const slug = this.pageSlug || this.rootSlug;
    try {
      if (this.hiddenPagePattern.test(slug)) {
        notFound();
      }
      const story = await this.getStory(slug);
      if (story.path && this.pageSlug === story.slug && !this.previewParams) {
        redirect(story.path);
      }
      return story;
    } catch (err: unknown) {
      if (isApiError(err) && err.status === 404) {
        notFound();
      } else {
        throw err;
      }
    }
  }

  async getStory(slug: string, storyParams?: StoryParams) {
    const { data } = await this.client.getStory(slug, {
      ...this.defaults,
      ...storyParams,
    });
    if (!data.story) notFound();
    const story = data.story as Story;

    this.rewriteLinks(story);
    this.resolveData(story);
    return story;
  }

  async resolveData(story: Story) {
    const resolvedData = {};
    const queue: Promise<unknown>[] = [];
    const context: ResolverContext = {
      story,
      loader: this,
    };
    try {
      resolveData(story, resolvedData, this.dataResolvers, context, [], queue);
      await Promise.all(queue);
    } catch (err) {
      console.log("Failed to resolve data", err);
    }
    story.resolved_data = resolvedData;
    story.public_url_prefix = this.publicUrlPrefix;
    story.preview_params = this.previewParams?.toString();
  }

  async getStories(storyParams?: StoriesParams) {
    const { data } = await this.client.getStories({
      ...this.defaults,
      ...storyParams,
    });
    data.stories.forEach(this.rewriteLinks);
    return data.stories as Story[];
  }
}
