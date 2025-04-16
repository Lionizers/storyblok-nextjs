import { is } from "type-assurance";

import {
  Asset,
  richTextImageToAsset,
  isAsset,
  isRichText,
  isRichTextImage,
} from "./storyblok-types";

type Excerpt = {
  images: Asset[];
  headlines: string[];
  text: string[];
};

export function extract(value: unknown) {
  const excerpt: Excerpt = {
    images: [],
    headlines: [],
    text: [],
  };
  collectText(value, excerpt);
  return excerpt;
}

export function charCount(value: unknown) {
  const { headlines, text } = extract(value);
  const countChars = (count: number, s: string) => count + s.length;
  return headlines.reduce(countChars, text.reduce(countChars, 0));
}

export function fullSentences(text: string[], maxChars = 500) {
  const s = text
    .join("\n")
    .slice(0, maxChars)
    .split(/([.!?])/);

  // Omit the last sentence if it's incomplete:
  const c = s.length > 1 ? s.length - (s.length % 2) : 1;

  return s.slice(0, c).join("");
}

function collectText(value: unknown, excerpt: Excerpt, key?: string) {
  if (key && is(value, String)) {
    // headline, subline, byline, etc.
    if (key.match(/head|line|title|slogan/i)) {
      excerpt.headlines.push(value);
    }
    if (key.match(/text|description/i)) {
      excerpt.text.push(value);
    }
  } else if (isAsset(value)) {
    excerpt.images.push(value);
  } else if (is(value, [])) {
    value.forEach((v) => collectText(v, excerpt));
  } else if (isRichText(value)) {
    collectRichtext(value, excerpt);
  } else if (is(value, [])) {
    value.forEach((v) => collectText(v, excerpt, key));
  } else if (is(value, { head: [], body: [] })) {
    collectText(value.head, excerpt, "head");
    collectText(value.body, excerpt, "body");
  } else if (is(value, {})) {
    Object.entries(value).forEach(([k, v]) => collectText(v, excerpt, k));
  }
}

function collectRichtext(value: unknown, excerpt: Excerpt, inHeading = false) {
  if (is(value, { text: String })) {
    excerpt.text.push(value.text);
    if (inHeading) excerpt.headlines.push(value.text);
  } else if (isRichTextImage(value)) {
    excerpt.images.push(richTextImageToAsset(value));
  } else if (is(value, { type: String, content: [] })) {
    collectRichtext(
      value.content,
      excerpt,
      inHeading || value.type === "heading"
    );
  } else if (is(value, [])) {
    value.forEach((v) => collectRichtext(v, excerpt, inHeading));
  }
}
