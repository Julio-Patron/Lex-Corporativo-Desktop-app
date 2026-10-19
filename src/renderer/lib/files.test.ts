import { describe, expect, it } from 'vitest';
import { ACCEPTED_DOCUMENT_TYPES, resolveMimeType, validateDocumentFile } from './files';

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

describe('filtro de archivos del renderer', () => {
  it('acepta sólo los formatos que el proceso principal puede extraer', () => {
    expect(validateDocumentFile(file('contrato.pdf'))).toBeNull();
    expect(validateDocumentFile(file('contrato.docx'))).toBeNull();
    expect(validateDocumentFile(file('cfdi.xml'))).toBeNull();
    expect(validateDocumentFile(file('notas.txt'))).toBeNull();
    expect(validateDocumentFile(file('notas.md'))).toBeNull();
    // .doc binario dejó de parsearse en document-parser.ts; el renderer no debe anunciarlo ni enviarlo.
    expect(validateDocumentFile(file('contrato.doc'))).toMatch(/Formato no compatible/);
    expect(ACCEPTED_DOCUMENT_TYPES.split(',')).not.toContain('.doc');
    expect(resolveMimeType(file('contrato.doc'))).not.toBe('application/msword');
  });

  it('rechaza archivos por encima del límite', () => {
    expect(validateDocumentFile(file('grande.pdf', 20 * 1024 * 1024 + 1))).toMatch(/20 MB/);
  });
});
