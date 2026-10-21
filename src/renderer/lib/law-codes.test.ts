import { describe, expect, it } from 'vitest';
import { provisionCountLabel, resolveLawCode } from './law-codes';

describe('law codes', () => {
  it('resolves canonical law codes and full law names while rejecting placeholders', () => {
    expect(resolveLawCode('LGSM')).toBe('LGSM');
    expect(resolveLawCode('Ley General de Sociedades Mercantiles')).toBe('LGSM');
    expect(resolveLawCode('Código Fiscal de la Federación (CFF)')).toBe('CFF');
    expect(resolveLawCode('Normativa local')).toBeNull();
    // El artículo "LA" dentro de un nombre desconocido no es la Ley Aduanera.
    expect(resolveLawCode('Reglamento de la Ley General de Salud')).toBeNull();
    expect(resolveLawCode('REGLAMENTO DE LA LEY GENERAL DE SALUD')).toBeNull();
    expect(resolveLawCode('LA')).toBe('LA');
    expect(resolveLawCode('Ley Aduanera')).toBe('LA');
  });

  it('resolves every installed law, including the RMF and the ISR regulation', () => {
    expect(resolveLawCode('RMF')).toBe('RMF');
    expect(resolveLawCode('Resolución Miscelánea Fiscal para 2026')).toBe('RMF');
    expect(resolveLawCode('RLISR')).toBe('RLISR');
    expect(resolveLawCode('Reglamento de la Ley del Impuesto sobre la Renta')).toBe('RLISR');
    expect(resolveLawCode('Ley del Impuesto sobre la Renta')).toBe('LISR');
    expect(resolveLawCode('CCom')).toBe('CCOM');
  });

  it('counts rules for the RMF and the RGCE and articles for the rest', () => {
    expect(provisionCountLabel('RMF', 1196)).toBe('1,196 reglas');
    expect(provisionCountLabel('LFT', 1)).toBe('1 artículo');
  });
});
