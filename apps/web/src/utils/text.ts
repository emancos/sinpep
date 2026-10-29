const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  deg: '°',
  ordm: 'º',
  ordf: 'ª',
  Aacute: 'Á',
  aacute: 'á',
  Agrave: 'À',
  agrave: 'à',
  Acirc: 'Â',
  acirc: 'â',
  Atilde: 'Ã',
  atilde: 'ã',
  Eacute: 'É',
  eacute: 'é',
  Ecirc: 'Ê',
  ecirc: 'ê',
  Iacute: 'Í',
  iacute: 'í',
  Oacute: 'Ó',
  oacute: 'ó',
  Ocirc: 'Ô',
  ocirc: 'ô',
  Otilde: 'Õ',
  otilde: 'õ',
  Uacute: 'Ú',
  uacute: 'ú',
  Uuml: 'Ü',
  uuml: 'ü',
  Ccedil: 'Ç',
  ccedil: 'ç',
};

export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';
  let decoded = str
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return NAMED_ENTITIES[entity] ?? match;
    });

  if (decoded.includes('&#') || decoded.includes('&amp;')) {
    decoded = decoded
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return !isNaN(code) ? String.fromCharCode(code) : _;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return !isNaN(code) ? String.fromCharCode(code) : _;
      })
      .replace(/&([a-zA-Z]+);/g, (match, entity) => {
        return NAMED_ENTITIES[entity] ?? match;
      });
  }

  return decoded;
}

