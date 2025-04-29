import { cloneElement, FunctionComponent, isValidElement } from "react";
import { ErrorBox } from "./error-box";
import { Block, Story } from "./storyblok-types";
import { Components, RichTextOptions } from "./types";
import { createRichTextComponent } from "./richtext";
import { useStoryblok } from "./hooks";
import { ISbStoryParams } from "@storyblok/react";

// Enable clickToEdit only inside iframes
const clickToEdit = typeof window !== "undefined" && window.top !== window;

function wrapBlok(comp: FunctionComponent) {
  if (clickToEdit && typeof comp === "function") {
    const w = (props: any) => {
      try {
        const el = comp(props);
        if (props._editable) {
          const attrs = editableDataAttrs(props._editable);
          if (attrs && isValidElement(el)) {
            return cloneElement(el, attrs);
          }
        }
        return el;
      } catch (err: any) {
        return <ErrorBox title={err.message}>{err.stack}</ErrorBox>;
      }
    };
    return w;
  }
  return comp;
}

/**
 * Returns the data attributes required for the Storyblok Visual Editor.
 */
function editableDataAttrs(editable: string) {
  const match = editable.match(/^<!--#storyblok#(.+)-->$/);
  if (match) {
    const [, c] = match;
    const opts = JSON.parse(c);
    return {
      "data-blok-c": c,
      "data-blok-uid": `${opts.id}-${opts.uid}`,
    };
  }
}

export function visualEditorProps(block: Block) {
  return block._editable ? editableDataAttrs(block._editable) : undefined;
}

export function createRenderComponents(
  blocks: Components,
  richTextOptions?: RichTextOptions
) {
  const components: Components = Object.fromEntries(
    Object.entries(blocks).map(([type, comp]) => [type, wrapBlok(comp)])
  );

  function One(props: Block & Record<string, unknown>) {
    if (!props.component) {
      return (
        <ErrorBox title="Invalid blok">
          Please provide a component property.
        </ErrorBox>
      );
    }
    const Component = components[props.component];
    if (!Component) {
      const error = `Missing component: ${props.component}`;
      console.error("Storyblok", error);
      return (
        <ErrorBox title={error}>
          Component <code>{props.component}</code> does not exist.
        </ErrorBox>
      );
    }
    return <Component {...props} />;
  }

  function List(props: { blocks: ReadonlyArray<Block> } & Record<string, any>) {
    const { blocks, _editable, ...defaults } = props;
    const overrides = _editable === false ? { _editable: "" } : {};
    if (blocks && !Array.isArray(blocks)) {
      console.error("List of blocks is not an array:", blocks);
      return [];
    }
    return blocks?.map((blok, i) => (
      <One
        key={blok._uid ?? i}
        _index={i}
        _total={blocks.length}
        {...defaults}
        {...blok}
        {...overrides}
      />
    ));
  }

  function LivePreview({
    story,
    params,
  }: {
    story: Story;
    params: ISbStoryParams;
  }) {
    const previewStory = useStoryblok(story, params);
    return <One {...previewStory.content} />;
  }

  const RichText = createRichTextComponent(One, richTextOptions);

  return { One, List, LivePreview, RichText };
}

export type RenderComponents = ReturnType<typeof createRenderComponents>;
