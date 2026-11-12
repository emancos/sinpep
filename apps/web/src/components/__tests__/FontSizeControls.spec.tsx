import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FontSizeProvider } from '../../contexts/FontSizeContext';
import { FontSizeControls } from '../FontSizeControls';

describe('FontSizeControls (acessibilidade de tamanho do texto)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.document.documentElement.style.fontSize = '';
    delete window.document.documentElement.dataset.fontScale;
  });

  const renderControls = () =>
    render(
      <FontSizeProvider>
        <FontSizeControls />
      </FontSizeProvider>,
    );

  it('inicia no tamanho padrão 100% e permite aumentar, diminuir e restaurar o texto global', async () => {
    const user = userEvent.setup();
    renderControls();

    const decreaseBtn = screen.getByRole('button', { name: 'Diminuir tamanho do texto' });
    const resetBtn = screen.getByRole('button', { name: 'Restaurar tamanho padrão do texto' });
    const increaseBtn = screen.getByRole('button', { name: 'Aumentar tamanho do texto' });

    expect(window.document.documentElement.style.fontSize).toBe('100%');
    expect(window.document.documentElement.dataset.fontScale).toBe('md');
    expect(decreaseBtn).toBeEnabled();
    expect(increaseBtn).toBeEnabled();

    // Aumenta para 112.5% e depois 125% (máximo)
    await user.click(increaseBtn);
    expect(window.document.documentElement.style.fontSize).toBe('112.5%');
    expect(window.localStorage.getItem('app_base-ui-font-size')).toBe('lg');
    expect(increaseBtn).toBeEnabled();

    await user.click(increaseBtn);
    expect(window.document.documentElement.style.fontSize).toBe('125%');
    expect(window.localStorage.getItem('app_base-ui-font-size')).toBe('xl');
    expect(increaseBtn).toBeDisabled();

    // Restaura para 100%
    await user.click(resetBtn);
    expect(window.document.documentElement.style.fontSize).toBe('100%');
    expect(window.localStorage.getItem('app_base-ui-font-size')).toBe('md');
    expect(increaseBtn).toBeEnabled();

    // Diminui para 87.5% (mínimo)
    await user.click(decreaseBtn);
    expect(window.document.documentElement.style.fontSize).toBe('87.5%');
    expect(window.localStorage.getItem('app_base-ui-font-size')).toBe('sm');
    expect(decreaseBtn).toBeDisabled();
  });

  it('restaura a escala salva em localStorage ao montar e ignora valor inválido', () => {
    window.localStorage.setItem('app_base-ui-font-size', 'lg');
    const { unmount } = renderControls();

    expect(window.document.documentElement.style.fontSize).toBe('112.5%');
    expect(window.document.documentElement.dataset.fontScale).toBe('lg');

    unmount();
    window.localStorage.setItem('app_base-ui-font-size', 'invalid-scale');
    renderControls();

    expect(window.document.documentElement.style.fontSize).toBe('100%');
    expect(window.document.documentElement.dataset.fontScale).toBe('md');
  });
});
