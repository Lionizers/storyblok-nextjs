import { ISbStoryParams } from "@storyblok/react";
import { ISbStoryData, ISbStoriesParams } from "storyblok-js-client";
import { optional, TypeFromSchema, typeGuard, union } from "type-assurance";

const assetSchema = {
  fieldtype: "asset",
  id: Number,
  filename: String,
  alt: String,
  name: String,
  focus: String,
  title: String,
  source: String,
  copyright: String,
  content_type: optional(String),
  is_private: optional(union(Boolean, "")),
  is_external_url: Boolean,
  svg: optional(String),
};

const emptyAssetSchema = {
  id: null,
  alt: null,
  name: "",
  focus: null,
  title: null,
  filename: union(null, ""),
  copyright: null,
  fieldtype: "asset",
};

export const isEmptyAsset = typeGuard(emptyAssetSchema);

export type Asset = TypeFromSchema<typeof assetSchema>;
export const isAsset = typeGuard(assetSchema);

export function asAsset(asset: Partial<Asset>): Asset {
  return {
    fieldtype: "asset",
    id: -1,
    filename: "",
    alt: "",
    name: "",
    focus: "",
    title: "",
    source: "",
    copyright: "",
    is_private: false,
    is_external_url: false,
    svg: undefined,
    ...asset,
  };
}

export type ResolvedLink = {
  public_url: string;
  linktype: string;
};

export type MultiLink = StoryLink | UrlLink | AssetLink | EmailLink;

export type StoryLink = {
  linktype: "story";
  id: string;
  cached_url: string;
  public_url?: string;
  story?: Story;
  anchor?: string;
};

export const isStoryLink = typeGuard({
  linktype: "story",
  id: String,
  cached_url: String,
  public_url: optional(String),
  anchor: optional(String),
});

export const isUrlLink = typeGuard({
  linktype: "url",
  url: String,
  public_url: optional(String),
});

export const isEmailLink = typeGuard({
  linktype: "email",
  url: String,
  email: String,
  public_url: optional(String),
});

export type UrlLink = {
  linktype: "url";
  url: string;
  cached_url: string;
  public_url?: string;
};

export type AssetLink = {
  linktype: "asset";
  cached_url: string;
};

export type EmailLink = {
  linktype: "email";
  cached_url: string;
};

export type Table = {
  thead: {
    _uid: string;
    value: string;
    component: "_table_head";
    _editable: string;
  }[];
  tbody: {
    _uid: string;
    body: {
      _uid: string;
      value: string;
      component: "_table_col";
      _editable: string;
    }[];

    component: "_table_row";
    _editable: string;
  };
}[];

export type Block<T = Record<string, unknown>> = T & {
  component?: string;
  _uid?: string;
  _editable?: string;
};

export const isBlock = typeGuard({
  component: String,
  _uid: String,
  _editable: optional(String),
});

const richTextSchema = { type: "doc", content: Array } as const;
export type RichText = TypeFromSchema<typeof richTextSchema>;
export const isRichText = typeGuard(richTextSchema);

const emptyRichTextSchema = {
  type: "doc",
  content: [{ type: "paragraph", text: undefined, content: undefined }],
};
export const isEmptyRichText = typeGuard(emptyRichTextSchema);

const richTextNodeSchema = { type: String, content: Array };
export type RichTextNode = TypeFromSchema<typeof richTextNodeSchema>;
export const isRichTextNode = typeGuard(richTextNodeSchema);

const richTextTextSchema = { type: "text", text: String };
export type RichTextText = TypeFromSchema<typeof richTextTextSchema>;
export const isRichTextText = typeGuard(richTextTextSchema);

export const isRichTextStoryLink = typeGuard({
  type: "link",
  attrs: {
    href: String,
    story: {
      url: String,
      full_slug: String,
    },
  },
});

const richTextImageSchema = {
  type: "image",
  attrs: {
    id: Number,
    src: String,
    alt: String,
    svg: optional(String),
  },
};

export const isRichTextImage = typeGuard(richTextImageSchema);
export type RichTextImage = TypeFromSchema<typeof richTextImageSchema>;

export function richTextImageToAsset(img: RichTextImage): Asset {
  return {
    ...asAsset(img.attrs),
    filename: img.attrs.src,
  };
}

const paragraphSchema = { type: "paragraph", content: Array };
export type Paragraph = TypeFromSchema<typeof paragraphSchema>;
export const isParagraph = typeGuard(paragraphSchema);

const listItemSchema = { type: "list_item", content: Array };
export type ListItem = TypeFromSchema<typeof listItemSchema>;
export const isListItem = typeGuard(listItemSchema);

const bulletListSchema = { type: "bullet_list", content: [isListItem] };
export type BulletList = TypeFromSchema<typeof bulletListSchema>;
export const isBulletList = typeGuard(bulletListSchema);

const richTextBlockSchema = {
  type: "blok",
  attrs: { id: String, body: Array },
};
export const isRichTextBlock = typeGuard(richTextBlockSchema);

export interface ExtendedStory {
  public_url?: string;
  public_url_prefix?: string;
  preview_params?: string;
  resolved_data?: Record<string, any>;
}

export interface StoryQueryParams {
  version?: "draft" | "published";
  resolve_level?: number;
  resolve_links?: "link" | "url" | "story" | "0" | "1";
  resolve_links_level?: 1 | 2;
  resolve_relations?: string | string[];
  from_release?: string;
  language?: string;
  fallback_lang?: string;
}

export type StoriesParams = ISbStoriesParams;
export type StoryParams = ISbStoryParams;
export type Story<Content = any> = ISbStoryData<Content> & ExtendedStory;

export type StoryMetaData = Omit<Story, "content">;

export const isStory = typeGuard({
  name: String,
  full_slug: String,
  path: union(null, String),
  public_url: optional(String),
  content: {
    component: String,
  },
});

const apiErrorSchema = { message: String, status: Number };
export type ApiError = TypeFromSchema<typeof apiErrorSchema>;
export const isApiError = typeGuard(apiErrorSchema);
