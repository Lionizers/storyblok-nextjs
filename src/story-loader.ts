import { notFound } from "next/navigation";
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
  client: StoryblokClient;
  defaults: StoryQueryParams;
  dataResolvers: Resolvers<any>;
  publicUrlPrefix?: string;
  previewParams?: URLSearchParams;
}

export class StoryLoader {
  protected pageSlug: string;
  protected client: StoryblokClient;
  protected defaults: StoryQueryParams;
  protected dataResolvers: Resolvers<any>;
  protected publicUrlPrefix: string | undefined;
  protected previewParams: URLSearchParams | undefined;

  rewriteLinks: (value: unknown) => void;

  constructor({
    pageSlug,
    client,
    defaults,
    dataResolvers,
    publicUrlPrefix,
    previewParams,
  }: StoryLoaderOptions) {
    this.pageSlug = pageSlug;
    this.client = client;
    this.defaults = defaults;
    this.dataResolvers = dataResolvers;
    this.publicUrlPrefix = publicUrlPrefix;
    this.previewParams = previewParams;
    this.rewriteLinks = rewriteLinks.bind(null, publicUrlPrefix, previewParams);
  }

  async getPageStory() {
    try {
      return await this.getStory(this.pageSlug);
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

    const story = data.story as Story;
    this.rewriteLinks(story);

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

    return story as Story;
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
