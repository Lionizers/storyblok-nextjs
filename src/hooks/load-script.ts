type Opts = {
  onload?: () => unknown;
  skipCheck?: boolean;
};

/**
 * Dynamically loads a script.
 */
export function loadScript(src: string, opts: Opts = {}) {
  if (!opts.skipCheck) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return;
  }
  const script = document.createElement("script");
  script.async = true;
  if (opts.onload) script.onload = opts.onload;
  script.src = src;
  document.body.appendChild(script);
}
