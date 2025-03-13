"use client";

import { useAdminUI } from "./hooks/admin-ui";

type Props = {
  space?: number | string;
  previewPath?: string;
};

export function AdminUI({ space, previewPath }: Props) {
  useAdminUI(space, previewPath);
  return <div id="app"></div>;
}
