import { ComponentType, useMemo } from "react";
import { is } from "type-assurance";
import {
  MARK_LINK,
  MARK_TEXT_STYLE,
  NODE_IMAGE,
  RenderOptions,
  render,
} from "storyblok-rich-text-react-renderer";
import {
  isBlock,
  isBulletList,
  isParagraph,
  isRichTextBlock,
  Paragraph,
  RichText,
  RichTextNode,
} from "./storyblok-types";
import { StoryblokImage } from "./storyblok-image";
import { getAssetDimensions } from "./assets";
import Link from "next/link";

function smartText(text: string) {
  return text
    ?.replace(/\u00a0/g, " ") // replace non-breaking spaces with regular spaces
    .replace(/(^|\s)(\w{1,5})-(\w{1,5})(?=\s|$)/g, "$1$2\u2011$3"); // replace hyphens with non-beaking hyphens
}

/**
 * The Storyblok richtext editor nests images inside paragraphs.
 * We lift them up one level so we can render them as figures or
 * target them in subgrid layouts.
 */
function hoistImages(doc: RichTextNode): RichTextNode {
  return {
    ...doc,
    content: doc.content.flatMap((c) =>
      isParagraph(c) ? splitParagraph(c) : c
    ),
  };
}

/**
 * Turns `<p>...<img>...</p>` into `<p>...</p><img/><p>...<p/>`.
 */
function splitParagraph(p: Paragraph) {
  const split: unknown[] = [];
  let para: Paragraph = { type: "paragraph", content: [] };
  for (const child of p.content) {
    if (is(child, { type: "image" })) {
      if (para.content.length) {
        split.push(para);
        para = { type: "paragraph", content: [] };
      }
      split.push(child);
    } else {
      para.content.push(child);
    }
  }
  split.push(para);
  return split;
}

function isInlineComponent(blok: unknown) {
  return (
    isRichTextBlock(blok) &&
    !!blok.attrs.body.find((c) => isBlock(c) && c.component.match(/inline/i))
  );
}

function stringToDoc(text: string | RichText): RichText {
  if (typeof text === "string") {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    };
  }
  return text;
}

/**
 * Move inline components into the preceeding paragraph.
 */
function inlineComponents(doc: RichTextNode): RichTextNode {
  const content = [];
  if (typeof doc === "string") {
    content.push({ type: "paragraph", content: [{ type: "text", text: doc }] });
  } else if (doc?.content) {
    for (let i = 0; i < doc.content.length; i++) {
      const c = doc.content[i];
      const prev = content.at(-1);
      if (isParagraph(prev) && isInlineComponent(c)) {
        prev.content.push(c);
        const next = doc.content[i + 1];
        if (isParagraph(next)) {
          prev.content.push(...next.content);
          i++;
        }
      } else {
        if (isParagraph(c)) {
          content.push({ ...c, content: [...c.content] });
        } else if (isBulletList(c)) {
          content.push({ ...c, content: c.content.map(inlineComponents) });
        } else {
          content.push(c);
        }
      }
    }
  }
  return {
    ...doc,
    content,
  };
}

function renderImage(props: { src?: string; alt?: string; title?: string }) {
  const { src, alt } = props;
  if (src) {
    return (
      <StoryblokImage src={src} alt={alt ?? ""} {...getAssetDimensions(src)} />
    );
  }
  return null;
}

export function createRichTextComponent(BlokComponent?: ComponentType<any>) {
  return function RichText({ text }: { text?: RichText }) {
    const options = useMemo<RenderOptions | undefined>(
      () => ({
        textResolver: smartText,
        nodeResolvers: {
          [NODE_IMAGE]: (_children, props) => {
            if (props.title) {
              return (
                <figure>
                  {renderImage(props)}
                  <figcaption>{props.title}</figcaption>
                </figure>
              );
            }
            return renderImage(props);
          },
        },
        markResolvers: {
          // Ignore all text styles that might have ended in the richtext document
          // instead of rendering a <span style={...}> node:
          [MARK_TEXT_STYLE]: (children) => <>{children}</>,
          [MARK_LINK]: (children, props) => {
            const { href, linktype } = props;
            if (href && linktype === "story") {
              return <Link href={href}>{children}</Link>;
            }
            return (
              <a href={href} target="_blank">
                {children}
              </a>
            );
          },
        },
        ...(BlokComponent && {
          defaultBlokResolver: (name, props) => {
            return (
              <BlokComponent key={props._uid} component={name} {...props} />
            );
          },
        }),
      }),
      [BlokComponent]
    );
    if (text) {
      const doc = hoistImages(inlineComponents(stringToDoc(text)));
      return render(doc, options);
    }
  };
}

export type RichTextComponent = ReturnType<typeof createRichTextComponent>;
