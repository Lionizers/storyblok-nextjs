"use client";

import { ReactNode, useEffect, useState } from "react";

import { isStoryblokPreview } from "./hooks/useStoryblokBridge";

function useIsPreview() {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(isStoryblokPreview());
  }, []);
  return preview;
}

type Props = {
  title?: string;
  children?: ReactNode;
};

export function ErrorBox({ title = "Error", children }: Props) {
  console.warn(title);
  const isPreview = useIsPreview();
  if (!isPreview) return null;
  return (
    <details
      style={{
        fontSize: "0.8em",
        borderRadius: "3px",
        textAlign: "left",
        background: "deeppink",
        color: "white",
      }}
    >
      <summary
        style={{
          padding: "1em",
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        {title}
      </summary>
      <div
        suppressHydrationWarning
        style={{
          opacity: 0.7,
          padding: "1em",
          marginTop: "-1.75em",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
    </details>
  );
}
