import { ComponentType, useMemo } from "react";
import { RenderOptions, render } from "storyblok-rich-text-react-renderer";
import { RichText } from "./storyblok-types";

export function createRichTextComponent(BlokComponent?: ComponentType<any>) {
  return function RichText({ text }: { text?: RichText }) {
    const options = useMemo<RenderOptions | undefined>(
      () =>
        BlokComponent && {
          defaultBlokResolver: (name, props) => {
            return (
              <BlokComponent key={props._uid} component={name} {...props} />
            );
          },
        },
      [BlokComponent]
    );
    return text && render(text, options);
  };
}

export type RichTextComponent = ReturnType<typeof createRichTextComponent>;
