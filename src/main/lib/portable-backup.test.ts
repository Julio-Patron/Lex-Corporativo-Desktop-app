import { describe, expect, it } from 'vitest';
import { openPortableBackup, sealPortableBackup } from './portable-backup';

const secretName = 'Cliente Confidencial Sentinela';
const secretBody = 'clausula-privada-sentinela-8c1d';

function payload() {
  return {
    format: 'lex-corporativo-vault-backup' as const,
    formatVersion: 1 as const,
    exportedAt: '2026-10-17T12:00:00.000Z',
    caseCount: 1,
    cases: [
      {
        metadata: { caseId: 'case_1', name: secretName, module: 'mercantil' },
        documents: [{ fileName: 'contrato.pdf', base64: secretBody }],
      },
    ],
  };
}

describe('portable vault backup', () => {
  it('round-trips the portfolio and keeps names out of the file', () => {
    const sealed = sealPortableBackup(payload(), 'frase-larga-1');
    const envelope = JSON.parse(sealed);

    expect(envelope.formatVersion).toBe(2);
    expect(envelope.ciphertext).toEqual(expect.any(String));
    expect(sealed).not.toContain(secretName);
    expect(sealed).not.toContain(secretBody);
    expect(openPortableBackup(sealed, 'frase-larga-1').cases).toEqual(payload().cases);
  });

  it('rejects a short password, a wrong password and a tampered file', () => {
    expect(() => sealPortableBackup(payload(), 'corta')).toThrow('al menos 8 caracteres');

    const sealed = sealPortableBackup(payload(), 'frase-larga-1');
    expect(() => openPortableBackup(sealed, 'otra-frase-2')).toThrow('no abre este respaldo');

    const tampered = JSON.parse(sealed) as { ciphertext: string };
    tampered.ciphertext = `${tampered.ciphertext.slice(0, -4)}AAAA`;
    expect(() => openPortableBackup(JSON.stringify(tampered), 'frase-larga-1')).toThrow('no abre este respaldo');
  });

  it('rejects a legacy cleartext backup', () => {
    expect(() => openPortableBackup(JSON.stringify(payload()), 'frase-larga-1')).toThrow('sin cifrar');
  });
});
