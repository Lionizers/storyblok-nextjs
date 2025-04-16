import { Asset } from "./storyblok-types";

type Dimensions = {
  width?: number;
  height?: number;
};

export function getAssetDimensions(src: string) {
  if (src.startsWith("/")) {
    // Don't optimize local images
    return {
      unoptimized: true,
      width: -1,
      height: -1,
    };
  }
  //a.storyblok.com/f/<space-id>/<width>x<height>/<id>/<name>.<ext>
  const m = /\/f\/\d+\/(\d+)x(\d+)/.exec(src);
  if (m) {
    const [, w, h] = m;
    return {
      width: parseInt(w, 10),
      height: parseInt(h, 10),
      unoptimized: src.includes(".svg"),
    };
  }
  return {
    width: 800,
    height: 600,
  };
}

function scale(orig: Dimensions, target: Dimensions | number | undefined) {
  if (!target) return orig;
  if (!orig.width || !orig.height) {
    if (typeof target === "number") {
      return {};
    }
    return target;
  }
  if (typeof target === "number") {
    return {
      width: orig.width,
      height: Math.round(orig.width / target),
    };
  }
  if (target.width && target.height) return target;
  const ratio = orig.width / orig.height;
  if (target.width) {
    return {
      width: target.width,
      height: Math.round(target.width / ratio),
    };
  }
  if (target.height) {
    return {
      width: Math.round(target.height * ratio),
      height: target.height,
    };
  }
  return orig;
}

type ImageOpts = Dimensions & {
  aspect?: number;
  fill?: boolean;
  next?: boolean;
  fallback?: any; //eslint-disable-line @typescript-eslint/no-explicit-any
};
export function getImageProps(asset: Asset, opts?: ImageOpts) {
  if (!asset?.filename) return { src: opts?.fallback, alt: "" };
  const { width, height, unoptimized, ...props } = getAssetDimensions(
    asset.filename
  );
  const basicProps = {
    src: encodeAspect(asset.filename, opts),
    alt: asset.alt || asset.name || "",
    unoptimized: opts?.next === false ? undefined : unoptimized,
    ...props,
  };
  if (opts?.fill) {
    return basicProps;
  }
  return {
    ...basicProps,
    ...scale({ width, height }, opts?.aspect ?? opts),
  };
}

/* function srcSetToImageSet(srcSet = "") {
  const imageSet = srcSet
    .split(", ")
    .map((str) => {
      const [url, dpi] = str.split(" ");
      return `url("${url}") ${dpi}`;
    })
    .join(", ");
  return `image-set(${imageSet})`;
} */

/* export function getBackgroundImage(asset: Asset, opts?: ImageOpts) {
  const { props } = getNextImageProps(getImageProps(asset, opts));
  return srcSetToImageSet(props.srcSet);
} */

/**
 * Adds desired aspect ratio as query parameter.
 * This will be picked up by the image loader to calculate the height for a given width.
 */
function encodeAspect(src: string, opts?: ImageOpts) {
  if (opts) {
    const ratio =
      opts.width && opts.height ? opts.width / opts.height : opts.aspect;
    if (ratio) {
      return `${src}?aspect=${ratio}`;
    }
  }
  return src;
}

/**
 * The default asset domain `a.storyblok.com` does not allow CORS requests,
 * while the alternative `a2.storyblok.com` domain includes an
 * `Access-Control-Allow-Origin: *` header.
 */
export function withCorsHeaders(url: string) {
  return url.replace("https://a.storyblok.com", "//a2.storyblok.com");
}
