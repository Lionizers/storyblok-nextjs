import { StoryblokClient } from "@storyblok/react";
import { createStoryblokClient } from "./client";
import {
  isApiError,
  StoriesParams,
  Story,
  StoryParams,
} from "./storyblok-types";
import { rewriteLinks } from "./rewrite-links";
import { resolveData } from "./resolve-data";
import { Components, PageParams, PageProps, Resolvers } from "./types";
import {
  BlockComponent,
  BlocksComponent,
  RichTextComponent,
  createComponents,
} from "./components";
import { AdminUI } from "./admin-ui";
import { ClientPage } from "./client-page";
import { NextRequest } from "next/server";
import { joinPath } from "./helpers";
import {
  createSlugToken,
  validatePreviewParams,
  validateSlugToken,
} from "./preview";

export class StoryblokNext<BlokTypes extends Components> {
  previewToken: string;
  client: StoryblokClient;
  rootSlug: string;
  defaultLanguage: string | undefined;
  defaultStoryParams: StoryParams;
  dataResolvers: Resolvers<BlokTypes>;

  Block: BlockComponent;
  Blocks: BlocksComponent;
  RichText: RichTextComponent;

  constructor({
    previewToken,
    blocks,
    dataResolvers,
    defaultLanguage,
    rootSlug = "home",
    defaultStoryParams = {
      resolve_links: "url",
    },
  }: {
    blocks: Components;
    dataResolvers: Resolvers<BlokTypes>;
    previewToken?: string;
    defaultLanguage?: string | undefined;
    rootSlug?: string;
    defaultStoryParams?: StoriesParams;
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
    this.client = createStoryblokClient(this.previewToken);
    this.rootSlug = rootSlug;
    this.dataResolvers = dataResolvers;
    this.defaultLanguage = defaultLanguage;
    this.defaultStoryParams = defaultStoryParams;

    const sb = createComponents(blocks);
    this.Block = sb.Block;
    this.Blocks = sb.Blocks;
    this.RichText = sb.RichText;
  }

  /**
   * A Next.js page handler to load and render the published version of
   * a story based on the [slug] and optionally [lang] parameters.
   */
  page = async ({ params }: PageProps) => {
    const story = await this.getStory(await params);
    return <this.Block {...story.content} />;
  };

  /**
   * A Next.js page handler to load and render the draft version of
   * a story based on the [slug], [token] and optionally [lang] parameters.
   * The `token` parameter must contain a vaild Storyblok preview token.
   * The page is rendered fully client-side and includes the Storyblok Bridge
   * to allow visual editing (click-to-edit).
   */
  previewPage = async ({ params }: PageProps) => {
    const story = await this.getStory(await params);
    return (
      <ClientPage
        story={story}
        params={this.defaultStoryParams}
        BlockComponent={this.Block}
      />
    );
  };

  /**
   * A Next.js page handler to render the Storyblok Admin UI locally.
   * This way, the Storyblok UI can be rendered without https during
   * development. It will also directly jump to the space associated with the
   * configured public token, thereby skipping the space selection screen.
   * By including custom CSS on that page, the login screen can be branded.
   */
  adminPage = async () => {
    const { data } = await this.client.get("cdn/spaces/me");
    return <AdminUI space={data.space.id} previewPath="/preview?slug=" />;
  };

  /**
   * A Next.js route handler for the visual editor.
   * Use it by setting the preview URL in Storyblok to:
   * `https://example.com/preview?token=<PREVIEW_TOKEN>&slug=`
   *
   * This handler will try to fetch the story for the given slug using the
   * provided access token. Upon success a redirect to the actual story is sent.
   */
  previewRoute = async (request: NextRequest) => {
    try {
      const { searchParams } = request.nextUrl;
      validatePreviewParams(searchParams, this.previewToken);
      const location = await this.getPreviewUrl(searchParams);
      return new Response(null, {
        status: 302,
        headers: {
          location,
        },
      });
    } catch (err) {
      // Could not fetch the story ...
      console.log(err);
      if (isApiError(err)) {
        return new Response(err.message, { status: err.status });
      }
      return new Response("Forbidden", { status: 403 });
    }
  };

  /**
   * Used internally by the previewRoute handler to process the query
   * parameters passed by Storyblok.
   */
  protected getPageParamsFromVisualEditor(params: URLSearchParams): PageParams {
    const path = params.get("slug") ?? this.rootSlug;
    const lang = params.get("_storyblok_lang") ?? this.defaultLanguage;
    const slug = path.split("/");
    if (slug[0] === lang) slug.shift();
    const token = createSlugToken(slug, this.previewToken);
    return {
      token,
      lang,
      slug,
    };
  }

  /**
   * Used internally by the previewRoute handler to construct the target preview URL.
   */
  protected async getPreviewUrl(searchParams: URLSearchParams) {
    const params = this.getPageParamsFromVisualEditor(searchParams);
    const story = await this.getStory(params);

    // We must preserve the original parameters as they are required by the visual editor
    // https://www.storyblok.com/docs/guide/essentials/visual-editor#additional-query-params
    searchParams.delete("slug");
    searchParams.delete("token");
    const query = `?${searchParams.toString()}`;
    return joinPath(this.getPrefix(params), story.full_slug) + query;
  }

  /**
   * Converts the configured default lang into the `default` keyword.
   * All other strings are returned verbatim.
   */
  protected langToDefaultKeyword(lang?: string) {
    return lang === this.defaultLanguage ? "default" : lang;
  }

  /**
   * Converts the `default` keyword into the configured default lang.
   * All other strings are returned verbatim.
   */
  protected defaultKeywordToLang(lang?: string) {
    return lang === "default" ? this.defaultLanguage : lang;
  }

  /**
   * Returns the prefix to be added to all link URLs in a story based on
   * the given PageParams.
   */
  protected getPrefix({ lang, token }: PageParams) {
    let path = "";
    if (this.defaultLanguage) {
      // The project uses i18n URLs, append the language to the prefix
      path = this.defaultKeywordToLang(lang) ?? this.defaultLanguage;
    }
    return this.getPreviewPath(path, token);
  }

  /**
   * Prefixes the given path with `/preview/${token}`.
   * If no token is provided, the path is returned verbatim.
   */
  protected getPreviewPath(path: string, token?: string) {
    return token ? joinPath("/preview", token, path) : path;
  }

  async getStory(params: PageParams) {
    const { slug = [this.rootSlug] } = params;
    const {
      data: { story },
    } = await this.client.getStory(slug.join("/"), {
      ...this.storyParamsForPage(params),
      ...this.defaultStoryParams,
    });
    rewriteLinks(story, this.getPrefix(params));
    await resolveData(story, this.dataResolvers, {
      prefix: this.getPrefix(params),
      locale: params.lang,
      params,
      story,
      client: this.client,
      getStories: this.getStories.bind(this, params),
    });
    return story as Story;
  }

  async getStories(pageParams: PageParams, storyParams?: StoriesParams) {
    const { data } = await this.client.getStories({
      ...this.storyParamsForPage(pageParams),
      ...storyParams,
    });
    const prefix = this.getPrefix(pageParams);
    data.stories.forEach((story) => rewriteLinks(story, prefix));
    return data.stories as Story[];
  }

  storyParamsForPage(params: PageParams): StoryParams {
    const { lang, token, slug } = params;
    if (token) validateSlugToken(token, slug, this.previewToken);
    return {
      language: lang && this.langToDefaultKeyword(lang),
      version: token ? "draft" : "published",
    };
  }
}
