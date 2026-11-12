import { describe, expect, it } from 'vitest';
import mainTsxRaw from '../main.tsx?raw';
import tailwindConfigRaw from '../../tailwind.config.js?raw';

async function readTextRelative(relativePath: string): Promise<string> {
  const fsModule = ['node', 'fs'].join(':');
  const { readFileSync } = await import(/* @vite-ignore */ fsModule);
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('Configuração da tipografia padrão (Roboto self-hosted & escalas Tailwind)', () => {
  it('inclui os pesos estáticos 400, 500, 600 e 700 de Roboto via @fontsource/roboto', async () => {
    for (const weight of ['400', '500', '600', '700']) {
      const css = await readTextRelative(`../../node_modules/@fontsource/roboto/${weight}.css`);
      expect(css).toContain("font-family: 'Roboto'");
      expect(css).toContain(`font-weight: ${weight}`);
    }
  });

  it('importa os pesos estáticos de @fontsource/roboto antes de ./index.css no entrypoint main.tsx', () => {
    const cssImportIndex = mainTsxRaw.indexOf("import './index.css'");
    expect(cssImportIndex).toBeGreaterThan(-1);

    for (const importPath of [
      '@fontsource/roboto/400.css',
      '@fontsource/roboto/400-italic.css',
      '@fontsource/roboto/500.css',
      '@fontsource/roboto/600.css',
      '@fontsource/roboto/700.css',
    ]) {
      const idx = mainTsxRaw.indexOf(`import '${importPath}'`);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(cssImportIndex);
    }
  });

  it('configura fontFamily.sans com Roboto e define as escalas fontSize 2xs e 3xs no tailwind.config.js', () => {
    expect(tailwindConfigRaw).toContain("import defaultTheme from 'tailwindcss/defaultTheme'");
    expect(tailwindConfigRaw).toContain(`sans: ['Roboto', ...defaultTheme.fontFamily.sans]`);
    expect(tailwindConfigRaw).toContain("'2xs': ['0.6875rem'");
    expect(tailwindConfigRaw).toContain("'3xs': ['0.625rem'");
  });

  it('aplica font-sans na base global (html, body) em index.css sem suavização antialiased forçada', async () => {
    const indexCssRaw = await readTextRelative('../index.css');
    expect(indexCssRaw).toMatch(/html,\s*body\s*\{[^}]*@apply[^;]*font-sans/s);
    expect(indexCssRaw).not.toMatch(/html,\s*body\s*\{[^}]*antialiased/s);
  });
});
