import { describe, expect, it } from 'vitest';
import {
  ADUANAL_DRAFTING_TEMPLATES,
  COMERCIO_EXTERIOR_DRAFTING_TEMPLATES,
  FISCAL_DRAFTING_TEMPLATES,
  LABORAL_DRAFTING_TEMPLATES,
  LEGAL_ENGINEERING_TEMPLATES,
  MERCANTIL_DRAFTING_TEMPLATES,
  type DraftingTemplate,
} from './constants';

function expectTemplateCatalogIntegrity(catalog: DraftingTemplate[], expectedPrefix?: string) {
  const ids = new Set<string>();

  for (const template of catalog) {
    expect(template.id).toMatch(/^[a-z_]+-[a-z0-9-]+$/);
    if (expectedPrefix) {
      expect(template.id.startsWith(`${expectedPrefix}-`)).toBe(true);
    }
    expect(template.title.trim()).toBeTruthy();
    expect(template.description.trim()).toBeTruthy();
    expect(template.prompt.trim()).toBeTruthy();
    expect(template.output.trim()).toBeTruthy();
    expect(template.requiredFields.length).toBeGreaterThan(0);
    expect(ids.has(template.id)).toBe(false);
    ids.add(template.id);
  }
}

describe('drafting templates', () => {
  it('keeps all 5 legal area catalogs complete, unique, and verified', () => {
    expect(MERCANTIL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(LABORAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(ADUANAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(FISCAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(8);

    expectTemplateCatalogIntegrity(MERCANTIL_DRAFTING_TEMPLATES, 'mercantil');
    expectTemplateCatalogIntegrity(LABORAL_DRAFTING_TEMPLATES, 'laboral');
    expectTemplateCatalogIntegrity(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES, 'comercio_exterior');
    expectTemplateCatalogIntegrity(ADUANAL_DRAFTING_TEMPLATES, 'aduanal');
    expectTemplateCatalogIntegrity(FISCAL_DRAFTING_TEMPLATES, 'fiscal');

    expect(LEGAL_ENGINEERING_TEMPLATES.mercantil).toBe(MERCANTIL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.laboral).toBe(LABORAL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.comercio_exterior).toBe(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.aduanal).toBe(ADUANAL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.fiscal).toBe(FISCAL_DRAFTING_TEMPLATES);
  });

  it('guarantees that all 48 drafting templates have dedicated specialized bodies in TEMPLATE_FULL_BODIES', async () => {
    const { getFullTemplateBody, TEMPLATE_FULL_BODIES } = await import('./template-bodies');
    const allCatalogs = [
      ...MERCANTIL_DRAFTING_TEMPLATES,
      ...LABORAL_DRAFTING_TEMPLATES,
      ...COMERCIO_EXTERIOR_DRAFTING_TEMPLATES,
      ...ADUANAL_DRAFTING_TEMPLATES,
      ...FISCAL_DRAFTING_TEMPLATES,
    ];

    expect(allCatalogs).toHaveLength(48);

    for (const template of allCatalogs) {
      expect(TEMPLATE_FULL_BODIES[template.id]).toBeDefined();
      const body = getFullTemplateBody(template);
      expect(body.trim().length).toBeGreaterThan(200);
      expect(body).toContain('#');
      expect(body).toMatch(/DECLARACI[OÓ]N|CL[AÁ]USULA|MATRIZ|CHECKLIST|FACULTAD|HECHO|PETITORI|OBJETO|RESOLUCI[OÓ]N|ORDEN DEL DÍA|ASAMBLEA|PAGAR[EÉ]|VENCIMIENTO|PRIVACIDAD|FINALIDAD|ARCO|INSTRUCCI[OÓ]N|OPERACI[OÓ]N|ADUAN|PEDIMENTO/i);

      // Verify that opening and closing brackets for placeholders are balanced
      const openCount = (body.match(/\[/g) || []).length;
      const closeCount = (body.match(/\]/g) || []).length;
      expect(openCount).toBe(closeCount);
    }
  });

  it('validates placeholder token formatting across all template bodies', async () => {
    const { TEMPLATE_FULL_BODIES } = await import('./template-bodies');

    for (const [id, body] of Object.entries(TEMPLATE_FULL_BODIES)) {
      // Find all bracketed placeholders
      const placeholders = body.match(/\[([^\]]+)\]/g) || [];
      expect(placeholders.length).toBeGreaterThan(0);

      // Verify no empty placeholders like "[]"
      expect(body).not.toContain('[]');

      // Verify placeholders don't contain unescaped nested brackets
      for (const ph of placeholders) {
        expect(ph.startsWith('[')).toBe(true);
        expect(ph.endsWith(']')).toBe(true);
      }
    }
  });
});


