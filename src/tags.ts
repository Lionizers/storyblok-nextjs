import { Story } from ".";
import { removeLastFolder, stripEndingSlash } from "./helpers";

export function getPageTags(story: Story) {
  const paths = new Set<string>();
  paths.add(story.full_slug);
  if (story.translated_slugs) {
    story.translated_slugs
      ?.map((s) => s.path)
      .forEach((path) => paths.add(path));
  }

  const tags = [story.uuid, getContentTypeTag(story.content.component)];
  paths.forEach((path) => {
    tags.push(stripEndingSlash(path));
    tags.push(getIndexTag(removeLastFolder(path)));
  });

  return tags;
}

export function getPageTag(slug: string) {
  return stripEndingSlash(slug);
}

export function getIndexTag(slug: string) {
  return `${stripEndingSlash(slug)}.index`;
}

export function getContentTypeTag(type: string) {
  return `type:${type}`;
}
