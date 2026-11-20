const defaultSocialImage =
  "https://nexfinity-store.vercel.app/images/favicon2.png";

export function updateSeoMetadata({
  title,
  description,
  canonical,
  image = defaultSocialImage,
  robots = "index, follow",
}) {
  const canonicalUrl = new URL(
    canonical,
    window.location.origin
  ).href;
  const imageUrl = new URL(
    image || defaultSocialImage,
    window.location.origin
  ).href;

  document.title = title;

  const metaTags = [
    ["name", "description", description],
    ["name", "robots", robots],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", canonicalUrl],
    ["property", "og:image", imageUrl],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", imageUrl],
  ];

  for (const [attribute, key, content] of metaTags) {
    let tag = document.head.querySelector(
      `meta[${attribute}="${key}"]`
    );

    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, key);
      document.head.appendChild(tag);
    }

    tag.setAttribute("content", content);
  }

  let canonicalTag = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!canonicalTag) {
    canonicalTag = document.createElement("link");
    canonicalTag.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalTag);
  }

  canonicalTag.setAttribute("href", canonicalUrl);
}
