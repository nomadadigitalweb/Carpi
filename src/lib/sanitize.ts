/**
 * Sanitize HTML content to prevent XSS.
 * Uses a whitelist approach for tags and attributes.
 */
export function sanitizeHtml(dirty: string): string {
  // Allowed tags and their allowed attributes
  const ALLOWED_TAGS: Record<string, string[]> = {
    h1: ["id", "class"],
    h2: ["id", "class"],
    h3: ["id", "class"],
    h4: ["id", "class"],
    h5: ["id", "class"],
    h6: ["id", "class"],
    p: ["class", "style"],
    br: [],
    hr: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    u: [],
    s: [],
    strike: [],
    sub: [],
    sup: [],
    blockquote: ["class"],
    pre: ["class"],
    code: ["class"],
    ul: ["class"],
    ol: ["class", "start", "type"],
    li: ["class"],
    a: ["href", "target", "rel", "title", "class"],
    img: ["src", "alt", "title", "width", "height", "class", "loading"],
    figure: ["class"],
    figcaption: ["class"],
    table: ["class", "border", "cellpadding", "cellspacing"],
    thead: [],
    tbody: [],
    tfoot: [],
    tr: ["class"],
    th: ["class", "colspan", "rowspan", "scope"],
    td: ["class", "colspan", "rowspan"],
    div: ["class", "style"],
    span: ["class", "style"],
    iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "allow", "title", "class"],
    video: ["src", "controls", "width", "height", "class"],
    source: ["src", "type"],
  };

  // Safe style properties
  const SAFE_STYLES = [
    "color",
    "background-color",
    "text-align",
    "font-size",
    "font-weight",
    "font-style",
    "text-decoration",
    "margin",
    "padding",
    "border",
    "width",
    "max-width",
    "height",
  ];

  // Allowed iframe sources (embed domains)
  const ALLOWED_IFRAME_HOSTS = [
    "www.youtube.com",
    "youtube.com",
    "player.vimeo.com",
    "www.dailymotion.com",
  ];

  // Remove script/style tags and their content
  let clean = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Process tags
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g, (match, tag, attrs) => {
    const tagLower = tag.toLowerCase();

    if (!(tagLower in ALLOWED_TAGS)) {
      return ""; // Strip disallowed tags
    }

    if (match.startsWith("</")) {
      return `</${tagLower}>`;
    }

    const allowedAttrs = ALLOWED_TAGS[tagLower];
    if (!attrs || allowedAttrs.length === 0) {
      const selfClosing = ["br", "hr", "img", "source"].includes(tagLower);
      return selfClosing ? `<${tagLower} />` : `<${tagLower}>`;
    }

    // Parse and filter attributes
    const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    const filteredAttrs: string[] = [];
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      if (!allowedAttrs.includes(attrName)) continue;

      // Validate href/src to prevent javascript: protocol
      if (
        (attrName === "href" || attrName === "src") &&
        /^javascript:/i.test(attrValue.trim())
      ) {
        continue;
      }

      // Validate iframe src
      if (tagLower === "iframe" && attrName === "src") {
        try {
          const url = new URL(attrValue);
          if (!ALLOWED_IFRAME_HOSTS.includes(url.hostname)) continue;
        } catch {
          continue;
        }
      }

      // Filter style values
      if (attrName === "style") {
        const safeStyles = attrValue
          .split(";")
          .filter((s) => {
            const prop = s.split(":")[0]?.trim().toLowerCase();
            return prop && SAFE_STYLES.includes(prop);
          })
          .join(";");
        if (safeStyles) {
          filteredAttrs.push(`style="${safeStyles}"`);
        }
        continue;
      }

      filteredAttrs.push(`${attrName}="${attrValue}"`);
    }

    // Force rel=noopener on links with target
    if (tagLower === "a" && filteredAttrs.some((a) => a.startsWith("target="))) {
      if (!filteredAttrs.some((a) => a.startsWith("rel="))) {
        filteredAttrs.push('rel="noopener noreferrer"');
      }
    }

    // Force lazy loading on images
    if (tagLower === "img" && !filteredAttrs.some((a) => a.startsWith("loading="))) {
      filteredAttrs.push('loading="lazy"');
    }

    const attrsStr = filteredAttrs.length ? " " + filteredAttrs.join(" ") : "";
    const selfClosing = ["br", "hr", "img", "source"].includes(tagLower);
    return selfClosing ? `<${tagLower}${attrsStr} />` : `<${tagLower}${attrsStr}>`;
  });

  return clean;
}
