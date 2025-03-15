import { is } from "type-assurance";

import { deepMerge } from "./helpers";
import {
  Asset,
  RichTextImage,
  isAsset,
  isBlock,
  isRichTextImage,
} from "./storyblok-types";
import { Components, ResolverContext, Resolvers } from "./types";

/**
 * Traverses a value and populates the given data record.
 * It looks for components for which a resolver has been provided.
 * It awaits the data and adds it to the component.
 * The resolvers are called with the matched component and the given context.
 */
export function resolveData<T extends Components>(
  value: unknown,
  data: Record<string, unknown>,
  resolvers: Resolvers<T>,
  context: ResolverContext,
  ancestors: unknown[] = [],
  queue: Promise<unknown>[]
) {
  if (is(value, [])) {
    value.forEach((v) =>
      resolveData(v, data, resolvers, context, [value, ...ancestors], queue)
    );
  } else if (is(value, {})) {
    if (isBlock(value)) {
      const resolver = resolvers[value.component];
      if (resolver) {
        queue.push(
          resolver(value as any, context, ancestors)
            .then(async (resolved) => {
              if (resolved) {
                await inlineSvgs(
                  resolved,
                  data,
                  context.revalidate ? 0 : false
                );
                data[value._uid] = resolved;
                deepMerge(value, resolved);
                context.loader.rewriteLinks(value);
              }
            })
            .catch((err) => {
              console.error(
                "Failed to resolve data for component",
                value.component,
                err
              );
              return;
            })
        );
      }
    } else if (
      (isAsset(value) || isRichTextImage(value)) &&
      shouldInlineSvg(value)
    ) {
      queue.push(
        fetchAndInlineSvg(value, data, context.revalidate ? 0 : false)
      );
    } else {
      context.loader.rewriteLinks(value);
    }

    Object.values(value).forEach((v) =>
      resolveData(v, data, resolvers, context, [value, ...ancestors], queue)
    );
  }
  return value;
}

function shouldInlineSvg(value: Asset | RichTextImage) {
  const src = isRichTextImage(value) ? value.attrs.src : value.filename;
  return src.endsWith(".svg");
}

async function fetchAndInlineSvg(
  image: Asset | RichTextImage,
  data: Record<string, unknown>,
  revalidate: number | false
) {
  const src = isRichTextImage(image) ? image.attrs.src : image.filename;
  const res = await fetch(src, {
    next: {
      revalidate,
    },
  } as RequestInit);
  if (res.ok) {
    const svg = await res.text();
    const target = isRichTextImage(image) ? image.attrs : image;
    target.svg = svg;
    data[target.id] = { svg };
  } else {
    console.error("Failed to fetch asset", src);
  }
}

async function inlineSvgs(
  value: unknown,
  data: Record<string, unknown>,
  revalidate: number | false
) {
  if ((isAsset(value) || isRichTextImage(value)) && shouldInlineSvg(value)) {
    await fetchAndInlineSvg(value, data, revalidate);
  } else if (is(value, {})) {
    await Promise.all(
      Object.values(value).map((v) => inlineSvgs(v, data, revalidate))
    );
  }
}
