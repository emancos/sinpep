import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../sanitizeHtml';

describe('sanitizeHtml (prevenção de XSS)', () => {
  it('mantém formatação segura de preparo de exames', () => {
    const clean = sanitizeHtml('<p><strong>Jejum de 8 horas</strong> antes do exame.</p><ul><li>Trazer RG</li></ul>');
    expect(clean).toContain('<strong>Jejum de 8 horas</strong>');
    expect(clean).toContain('<li>Trazer RG</li>');
  });

  it('remove tags script, iframe, svg e atributos de evento on*', () => {
    const dirty =
      '<p onclick="alert(1)">Texto</p><script>fetch("https://evil.test")</script><iframe src="https://evil.test"></iframe><img src="x" onerror="alert(2)" />';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<p>Texto</p>');
  });

  it('bloqueia links com protocolo javascript:', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">Clique</a>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Clique');
  });
});
