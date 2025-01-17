import { ISbStoryParams } from "@storyblok/react";
import { Asset } from "next/font/google";
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
};

export const isStoryLink = typeGuard({
  linktype: "story",
  id: String,
  cached_url: String,
  public_url: optional(String),
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

const docSchema = { type: "doc", content: Array } as const;
export type Doc = TypeFromSchema<typeof docSchema>;
export const isDoc = typeGuard(docSchema);

const emptyDocSchema = {
  type: "doc",
  content: [{ type: "paragraph", text: undefined, content: undefined }],
};
export const isEmptyDoc = typeGuard(emptyDocSchema);

const docNodeSchema = { type: String, content: Array };
export type DocNode = TypeFromSchema<typeof docNodeSchema>;
export const isDocNode = typeGuard(docNodeSchema);

export const isDocStoryLink = typeGuard({
  type: "link",
  attrs: {
    href: String,
    story: {
      url: String,
      full_slug: String,
    },
  },
});

const docImageSchema = {
  type: "image",
  attrs: {
    id: Number,
    src: String,
    alt: String,
    svg: optional(String),
  },
};

export const isDocImage = typeGuard(docImageSchema);
export type DocImage = TypeFromSchema<typeof docImageSchema>;

export function docImageToAsset(img: DocImage): Asset {
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

const docBlokSchema = { type: "blok", attrs: { id: String, body: Array } };
export const isDocBlok = typeGuard(docBlokSchema);

type ExtendedStory = {
  public_url?: string;
  public_url_prefix?: string;
  resolved_data?: Record<string, any>;
};

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
