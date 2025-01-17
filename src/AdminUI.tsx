"use client";

import { useAdminUI } from "./hooks/useAdminUI";

type Props = {
  space?: number;
  previewUrl?: string;
};

export function AdminUI({ space, previewUrl }: Props) {
  useAdminUI(space, previewUrl);
  return <div id="app"></div>;
}
