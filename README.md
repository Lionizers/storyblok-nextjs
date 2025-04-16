# storyblok-nextjs

Modern Next.js integration for Storyblok

## Features

- 🚀 **React Server Components Support**: Built for Next.js App Router
- 🔄 **Live Preview**: Real-time preview with automatic updates via Storyblok Bridge
- 🗄️ **Smart Caching**: Automatic cache invalidation using Next.js cache tags
- 🖼️ **Image Optimization**: Seamlessly use next/image with Stroyblok assets

## Quick Start

The easiest way to get started is by using this command:

```bash
npx create-next-app@latest --example https://github.com/lionizers/storyblok-nextjs-example
```

Create a `.env.local` in the root directory of the newly created project and add the following line:

```
STORYBLOK_PREVIEW_TOKEN=<YOUR-PREVIEW-TOKEN>
```

## Manual Setup

Alternatively, you can follow this step-by-step guide to set things up manually. Start by installing the package:

```bash
npm install storyblok-nextjs
```

## 1. Create React components for your blocks

Let's start with a simple component that matches the `teaser` block type as it is present in Storyblok's Demo Space:

```ts
// /blocks/Teaser.tsx

type Props = {
  title: string;
};
export function Teaser({ title }: Props) {
  return (
    <div>
      <h2>{title}</h2>
    </div>
  );
}
```

Obviously, a teaser with just a title is not very helpful. No worries, we'll revisit this later. Note that we don't have to do anything special to make the component compatible with Storyblok's visual editor. The _Render components_, we'll create in the next step will take care of this.

## 2. Create Render components  

In order to render our blocks, we need some helpers – the so called _Render components_:

* `<Render.List />` – Renders a list of blocks.
* `<Render.One />` – Renders a single block.
* `<Render.RichText />` – Renders a RichText document which may contain blocks.
* `<Render.LivePreview />` – Renders a story, enabling live updates via the Storyblok Bridge.

We can create all these components by calling `createRenderComponents()`, passing all our previously created blocks. Make sure to use the same names as the _technical name_ in your Block Library.

```ts
// /blocks/index.ts

import { createRenderComponents } from "storyblok-nextjs";
import feature from "./Feature";
import grid from "./Grid";
import teaser from "./Teaser";
import page from "./Page";

export const Render = createRenderComponents({
  feature,
  grid,
  teaser,
  page,
});
```

## 3. Use the Render components

Let's create another block for a type that also comes with Storyblok's Demo Space: a `grid`. It has a field called _columns_ with the type _Blocks_. We can type this properly by importing the `Block` type from `storyblok-nextjs`.

We'll then import the `Render` components we created in the previous step and use `<Render.List />` to render the grid columns:

```tsx
// /blocks/Grid.tsx

import type { Block } from "storyblok-nextjs";
import { Render } from "@/blocks";

type Props = {
  columns: Block[];
};

export default function Grid({ columns }: Props) {
  return (
    <div className="grid grid-cols-3">
      <Render.List blocks={columns} />
    </div>
  );
}
```

### 3.1 Rendering rich text

The `<Render.RichText />` component can be used to render rich text fields with nested blocks. As an example, we'll add a rich text field to the teaser block:

```tsx
// /blocks/Teaser.tsx

import type { RichText } from "storyblok-nextjs";
import { Render } from "@/blocks";

type Props = {
  headline: string;
  text?: RichText;
};

export default function Teaser({ headline, text }: Props) {
  return (
    <div>
      <h2 className="text-2xl mb-10">{headline}</h2>
      <Render.RichText text={text} />
    </div>
  );
}
```


## 4. Create a `StoryblokNext` instance

Next, we'll create an instance of `StoryblokNext`. It takes a couple of options that we will cover later. For now, all you need is a Storyblok preview token. If omitted, StoryblokNext will try to read it from the `STORYBLOK_PREVIEW_TOKEN` env variable.

```ts
// /storyblok.ts

import { StoryblokNext } from "storyblok-nextjs/server";

export const sb = new StoryblokNext({
  previewToken: "YOUR_PREVIEW_TOKEN"
});
```

## 5. Create some routes

Using the Next.js App Router, create the following three routes:

```
app
├── [[...slug]]
│   └── page.tsx
├── preview
│   └── [...slug]
│       └── page.tsx
└── admin
    └── page.tsx
    └── webhook
        └── route.ts
```

* `/[[...slug]]` – The default route to serve the server-rendered published pages
* `/preview/[...slug]` – Route for live previews in the Visual Editor
* `/admin` – The Storyblok admin UI served under our domain
* `/admin/webhook` – A webhook to invalidate stories upon publish

This is the most basic setup. For multilingual websites, the default route would be `/[lang]/[[...slug]]` instead.

#### 5.1 The default route

For the default route, we'll use the `page()` method of the `StoryblokNext` instance we created earlier.
It will return a React Server component that loads a published story using the requested `slug` (and optionally `lang`) and renders it using the provided _Render_ components:

```tsx
// /app/[[...slug]]/page.tsx

import { sb } from "@/storyblok";
import { Render } from "@/blocks";

export const dynamic = "error";
export const dynamicParams = true;

export default sb.page(Render);
```

#### 5.2 The preview route

The preview route works quite similar, but instead of the _Render_ components, we need to pass a _Client Component_ to the `previewPage()` method:

```tsx
// /app/preview/[...slug]/page.tsx

import { sb } from "@/storyblok";
import Preview from "./Preview";

export default sb.previewPage(Preview);
```

This is what the Preview component looks like:

```tsx
// /app/preview/[...slug]/Preview.tsx

"use client";
import { Render } from "@/blocks";
export default Render.LivePreview;
```

The important part is the `"use client"` directive at the top of the file. Everything from down here will happen in the client. This is what allows us to get the instant live previews inside Storyblok's visual editor.

### 5.3 The admin route

The admin route is optional, you can also use `https://app.storyblok.com` directly. The advantage of this approach is that you don't need to set up HTTPS for local development. It also allows you to add you own branding to the login page via CSS.

```tsx
// /app/admin/page.tsx

import { sb } from "@/storyblok";
export default sb.adminPage();
```

### 5.3 The webhook

This route provides a webhook that Storyblok can call if a story gets published or deleted. This will invalidate the data in the Next.js cache that has been tagged with the story.

```tsx
// /app/admin/webhook/route.ts

import { sb } from "@/storyblok";
export const POST = sb.webhook({
  validate: true,
  secret: "MY-WEBHOOK-SECRET"
});
```

## Additional data fetching

Some of your blocks might need to fetch additional data, based on their own properties. This can be done with `dataResolvers`. A resolver receives the block data from the story and a context and can use both to asynchronously fetch additional data.

Let's say we want to add a navigation menu to our pages that lists all stories in the root folder. First, we extend our `page` block and add a `menu` property:

```tsx
// /blocks/Page.tsx

import { Block } from "storyblok-nextjs";
import { Render } from "@/blocks";

type Props = {
  body: Block[];
  menu: Array<{
    title: string;
    link: string;
  }>
};

export default function Page({ body, menu }: Props) {
  return (
    <div>
      <div>
        {menu.map((item, i) => (
          <a key={i} href={link}>{title}</a>
        )}
      </div>
      <Render.List blocks={body} />
    </div>
  );
}
```

With the new property in place, we can now configure a data resolver to populate it:

```ts
// /storyblok.ts

import { StoryblokNext } from "storyblok-nextjs";
import { blocks } from "@/blocks";

export const sb = new StoryblokNext<typeof blocks>({
  dataResolvers: {
    async page(props, { loader }) {
      const rootStories = await loader.getStories({
        level: 1,
      });
      return {
        menu: rootStories.map((s) => ({
          title: s.name,
          link: s.public_url!,
        })),
      };
    },
  },
});
```

## Image Optimization

Use `StoryblokImage`, a wrapper around `next/image` to render Storyblok assets using a custom loader:

```typescript
import { StoryblokImage } from "storyblok-nextjs";

export function Hero({ image }) {
  return <StoryblokImage {...image} />;
}
```