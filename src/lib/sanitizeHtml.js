import sanitize from 'sanitize-html';

// Allowlist for HTML written in the admin rich-text editor (blog posts, policies).
// Anything not listed here (scripts, styles, event handlers, iframes) is removed.

const OPTIONS = {
  allowedTags: [
    'h2',
    'h3',
    'h4',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'figure',
    'figcaption',
    'code',
    'pre',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    h2: ['id'],
    h3: ['id'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https'] },
  transformTags: {
    // Links that open a new tab must not give the new page access to ours.
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
  },
};

export function sanitizeRichText(html) {
  return sanitize(html ?? '', OPTIONS);
}
