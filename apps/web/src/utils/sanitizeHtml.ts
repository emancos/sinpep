const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'SPAN',
  'DIV',
  'BLOCKQUOTE',
  'HR',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'A',
]);

const FORBIDDEN_CONTAINER_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
  'LINK',
  'META',
  'BASE',
]);

const ALLOWED_ATTRS = new Set(['class', 'href', 'target', 'rel', 'colspan', 'rowspan']);

function isSafeUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase().replace(/[\u0000-\u0020]+/g, '');
  if (!normalized) return true;
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('/') ||
    normalized.startsWith('#')
  );
}

/**
 * Sanitiza HTML antes de renderização com dangerouslySetInnerHTML,
 * removendo scripts, event handlers (on*) e protocolos perigosos (javascript:, data:).
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return dirtyHtml.replace(/<[^>]*>/g, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  const sanitizeNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toUpperCase();

        if (FORBIDDEN_CONTAINER_TAGS.has(tag)) {
          el.remove();
          continue;
        }

        if (!ALLOWED_TAGS.has(tag)) {
          sanitizeNode(el);
          while (el.firstChild) {
            node.insertBefore(el.firstChild, el);
          }
          el.remove();
          continue;
        }

        for (const attr of Array.from(el.attributes)) {
          const attrName = attr.name.toLowerCase();
          if (attrName.startsWith('on') || !ALLOWED_ATTRS.has(attrName)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (attrName === 'href' && !isSafeUrl(attr.value)) {
            el.removeAttribute('href');
          }
        }

        if (tag === 'A' && el.getAttribute('target') === '_blank') {
          el.setAttribute('rel', 'noopener noreferrer');
        }

        sanitizeNode(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}
