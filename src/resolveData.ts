import { ComponentPropsWithoutRef, FunctionComponent } from "react";
import { is, optional, typeGuard } from "type-assurance";

import { deepMerge, startTimer } from "./helpers";
import { rewriteLink, rewriteLinks } from "./rewriteLinks";
import { Asset, DocImage, isAsset, isBlock, isDocImage, Story } from "./types";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type Components = Record<string, FunctionComponent<any>>;

export type Resolvers<C extends Components, CustomContext> = {
  [K in keyof C]?: Resolver<C[K], CustomContext>;
};

type Resolver<C extends FunctionComponent, CustomContext> = (
  props: ComponentPropsWithoutRef<C>,
  context: ResolverContext<CustomContext>,
  ancestors: unknown[]
) => Promise<void | Partial<ComponentPropsWithoutRef<C>>>;

export type ResolverContext<CustomContext> = CustomContext & {
  prefix: string;
  locale?: string;
  revalidate?: boolean;
};

/**
 * Extends a Story by loading and inlining external data.
 * The function traverses the story and looks for components for which a
 * resolver has been provided. It awaits the data and adds it to the component.
 * The resolvers are called with the matched component and the given context.
 */
export async function resolveData<T extends Components, CustomContext>(
  story: Story,
  resolvers: Resolvers<T, CustomContext>,
  context: ResolverContext<CustomContext>
) {
  const logTime = startTimer("resolveData");
  const data = {};
  const queue: Promise<unknown>[] = [];
  try {
    resolve(story, data, resolvers, context, [], queue);
    logTime("collected");
    await Promise.all(queue);
    logTime();
  } catch (err) {
    console.log("Failed to resolve data", err);
  }
  story.resolved_data = data;
  story.public_url_prefix = context.prefix;
}

const isLocaleAware = typeGuard({ locale: optional(String) });

function resolve<T extends Components, X>(
  value: unknown,
  data: Record<string, unknown>,
  resolvers: Resolvers<T, X>,
  context: ResolverContext<X>,
  ancestors: unknown[] = [],
  queue: Promise<unknown>[]
) {
  if (is(value, {})) {
    if (isBlock(value) && isLocaleAware(value)) {
      value.locale = context.locale;
      const resolver = resolvers[value.component];
      if (resolver) {
        queue.push(
          resolver(value as any, context, ancestors) //eslint-disable-line @typescript-eslint/no-explicit-any
            .then(async (resolved) => {
              if (resolved) {
                await inlineSvgs(
                  resolved,
                  data,
                  context.revalidate ? 0 : false
                );
                data[value._uid] = resolved;
                deepMerge(value, resolved);
                rewriteLinks(value, context.prefix);
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
      (isAsset(value) || isDocImage(value)) &&
      shouldInlineSvg(value)
    ) {
      queue.push(
        fetchAndInlineSvg(value, data, context.revalidate ? 0 : false)
      );
    } else {
      rewriteLink(value, context.prefix);
    }

    Object.values(value).forEach((v) =>
      resolve(v, data, resolvers, context, [value, ...ancestors], queue)
    );
  } else if (is(value, [])) {
    value.forEach((v) =>
      resolve(v, data, resolvers, context, [value, ...ancestors], queue)
    );
  }
  return value;
}

function shouldInlineSvg(value: Asset | DocImage) {
  const src = isDocImage(value) ? value.attrs.src : value.filename;
  return src.endsWith(".svg");
}

async function fetchAndInlineSvg(
  image: Asset | DocImage,
  data: Record<string, unknown>,
  revalidate: number | false
) {
  const src = isDocImage(image) ? image.attrs.src : image.filename;
  const res = await fetch(src, {
    next: {
      revalidate,
    },
  } as RequestInit);
  if (res.ok) {
    const svg = await res.text();
    const target = isDocImage(image) ? image.attrs : image;
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
  if ((isAsset(value) || isDocImage(value)) && shouldInlineSvg(value)) {
    await fetchAndInlineSvg(value, data, revalidate);
  } else if (is(value, {})) {
    await Promise.all(
      Object.values(value).map((v) => inlineSvgs(v, data, revalidate))
    );
  }
}
