import { StoryblokClient } from "@storyblok/react";
import { createStoryblokClient } from "./client";
import { StoriesParams, StoryQueryParams } from "./storyblok-types";
import { Components, PageProps, Resolvers } from "./types";
import { AdminUI } from "./admin-ui";
import { joinPath } from "./helpers";
import { validatePreviewParams } from "./preview";
import { ComponentType } from "react";
import { redirect } from "next/navigation";
import { RenderComponents } from "./render-components";
import { StoryLoader, StoryLoaderOptions } from "./story-loader";
import { NextRequest } from "next/server";
import { handleWebhookRequest } from "./cache";

export class StoryblokNext<BlokTypes extends Components> {
  previewToken: string;
  previewPath: string;
  client: StoryblokClient;
  rootSlug: string;
  defaultLanguage: string | undefined;
  defaultStoryQueryParams: StoryQueryParams;
  dataResolvers: Resolvers<BlokTypes>;
  hiddenPagePattern: RegExp;

  constructor({
    previewToken,
    previewPath = "/preview",
    dataResolvers,
    defaultLanguage,
    hiddenPagePattern = /^_/,
    rootSlug = "home",
    defaultStoryQueryParams = {
      resolve_links: "url",
    },
  }: {
    dataResolvers: Resolvers<BlokTypes>;
    previewToken?: string;
    previewPath?: string;
    defaultLanguage?: string | undefined;
    hiddenPagePattern?: RegExp;
    rootSlug?: string;
    defaultStoryQueryParams?: StoriesParams;
  }) {
    if (!previewToken) {
      previewToken = process.env.STORYBLOK_PREVIEW_TOKEN;
      if (!previewToken) {
        throw new Error(
          "Either pass a previewToken or set the STORYBLOK_PREVIEW_TOKEN env."
        );
      }
    }
    this.previewToken = previewToken;
    this.previewPath = joinPath("/", previewPath, "/");
    this.client = createStoryblokClient(this.previewToken);
    this.rootSlug = rootSlug;
    this.dataResolvers = dataResolvers;
    this.defaultLanguage = defaultLanguage;
    this.hiddenPagePattern = hiddenPagePattern;
    this.defaultStoryQueryParams = defaultStoryQueryParams;
  }

  isRootSlug(slug: string[]) {
    return slug.length === 1 && slug[0] === this.rootSlug;
  }

  async createLoader(props: PageProps, preview = false): Promise<StoryLoader> {
    const { slug = [], lang } = await props.params;
    const options: StoryLoaderOptions = {
      pageSlug: slug.join("/"),
      rootSlug: this.rootSlug,
      client: this.client,
      dataResolvers: this.dataResolvers,
      hiddenPagePattern: this.hiddenPagePattern,
      defaults: {
        ...this.defaultStoryQueryParams,
        version: "published",
        language: lang,
      },
    };
    if (preview) {
      const searchParams = await props.searchParams;
      if (searchParams?._storyblok_published) {
        const publicUrl = this.isRootSlug(slug) ? "/" : joinPath("/", ...slug);
        redirect(publicUrl); // this throws
      }
      validatePreviewParams(searchParams, this.previewToken);
      options.defaults.version = "draft";
      options.publicUrlPrefix = this.previewPath;
      options.previewParams =
        searchParams && new URLSearchParams(searchParams as any);
    }
    return new StoryLoader(options);
  }

  /**
   * A Next.js page handler to load and render the published version of
   * a story based on the [slug] and optionally [lang] parameters.
   */
  page(Render: RenderComponents) {
    return async (props: PageProps) => {
      const loader = await this.createLoader(props);
      const story = await loader.getPageStory();
      return <Render.One {...story.content} />;
    };
  }

  /**
   * A Next.js page handler to load and render a story by its type rather than
   * its slug. This can be used to render pages that only exist once.
   */
  singletonPage(
    type: keyof BlokTypes,
    Render: RenderComponents,
    preview?: boolean
  ) {
    return async (props: PageProps) => {
      const loader = await this.createLoader(props, preview);
      const [story] = await loader.getStories({
        content_type: type as string,
        per_page: 1,
      });
      if (!story) return null;
      await loader.resolveData(story);
      return <Render.One {...story.content} />;
    };
  }

  /**
   * A Next.js page handler to load and render the draft version of
   * a story based on the [slug], [token] and optionally [lang] parameters.
   * The `token` parameter must contain a vaild Storyblok preview token.
   * The page is rendered fully client-side and includes the Storyblok Bridge
   * to allow visual editing (click-to-edit).
   */
  previewPage(ClientPage: ComponentType<any>) {
    return async (props: PageProps) => {
      const loader = await this.createLoader(props, true);
      const story = await loader.getPageStory();
      return <ClientPage story={story} params={this.defaultStoryQueryParams} />;
    };
  }

  /**
   * A Next.js page handler to render the Storyblok Admin UI locally. This way,
   * the Storyblok UI can be rendered without https during development.
   * Optionally, it will skip the space selection screen and jump  directly
   * to the space associated with the configured token.
   *
   * NOTE: By including custom CSS on that page, the login screen can be branded.
   */
  adminPage(opts: { skipSpaces?: boolean } = {}) {
    const { skipSpaces = true } = opts;
    if (skipSpaces) {
      return async () => {
        const { data } = await this.client.get("cdn/spaces/me");
        return <AdminUI space={data.space.id} previewPath={this.previewPath} />;
      };
    }
    return () => {
      return <AdminUI previewPath={this.previewPath} />;
    };
  }

  webhook(opts: { secret?: string } = {}) {
    const { secret = process.env.STORYBLOK_WEBHOOK_SECRET } = opts;
    return async (req: NextRequest) => {
      return handleWebhookRequest(req, this.client, secret);
    };
  }
}
