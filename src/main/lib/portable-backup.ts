import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';

export const MIN_PORTABLE_BACKUP_PASSWORD_LENGTH = 8;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

const SHORT_PASSWORD = 'La contraseña del respaldo debe tener al menos 8 caracteres.';
const WRONG_PASSWORD = 'La contraseña no abre este respaldo.';
const CLEARTEXT_BACKUP = 'Este archivo es un respaldo sin cifrar y no se puede restaurar.';
export const DAMAGED_BACKUP = 'El respaldo está dañado o no es un archivo de Lex Corporativo.';

export interface PortableBackupCore {
  format: 'lex-corporativo-vault-backup';
  formatVersion: 1;
  exportedAt: string;
  caseCount: number;
  cases: unknown[];
}

export interface OpenedPortableBackup extends PortableBackupCore {
  packageHash: string;
}

function assertPassword(password: string): void {
  if (typeof password !== 'string' || password.length < MIN_PORTABLE_BACKUP_PASSWORD_LENGTH) {
    throw new Error(SHORT_PASSWORD);
  }
}

export function hashPortableBackupCore(core: PortableBackupCore): string {
  return createHash('sha256').update(JSON.stringify(core)).digest('hex');
}

export function sealPortableBackup(core: PortableBackupCore, password: string): string {
  assertPassword(password);
  if (core.format !== 'lex-corporativo-vault-backup' || core.formatVersion !== 1 || !Array.isArray(core.cases)) {
    throw new Error(DAMAGED_BACKUP);
  }
  const payload: OpenedPortableBackup = { ...core, packageHash: hashPortableBackupCore(core) };
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(password, salt, 32, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return JSON.stringify({
    format: 'lex-corporativo-vault-backup',
    formatVersion: 2,
    protection: 'password',
    kdf: 'scrypt',
    cipher: 'aes-256-gcm',
    scrypt: { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  });
}

export function openPortableBackup(serialized: string, password: string): OpenedPortableBackup {
  assertPassword(password);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(serialized) as Record<string, unknown>;
  } catch {
    throw new Error(DAMAGED_BACKUP);
  }
  if (
    parsed.format === 'lex-corporativo-vault-backup'
    && parsed.formatVersion === 1
    && Array.isArray(parsed.cases)
    && typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error(CLEARTEXT_BACKUP);
  }
  const params = parsed.scrypt as { N?: number; r?: number; p?: number } | undefined;
  if (
    parsed.format !== 'lex-corporativo-vault-backup'
    || parsed.formatVersion !== 2
    || parsed.kdf !== 'scrypt'
    || parsed.cipher !== 'aes-256-gcm'
    || params?.N !== SCRYPT_N
    || params?.r !== SCRYPT_R
    || params?.p !== SCRYPT_P
  ) {
    throw new Error(DAMAGED_BACKUP);
  }

  try {
    const key = scryptSync(password, Buffer.from(String(parsed.salt), 'base64'), 32, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(String(parsed.iv), 'base64'));
    decipher.setAuthTag(Buffer.from(String(parsed.tag), 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(String(parsed.ciphertext), 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const payload = JSON.parse(plaintext) as OpenedPortableBackup;
    const { packageHash, ...core } = payload;
    if (hashPortableBackupCore(core as PortableBackupCore) !== packageHash) throw new Error(DAMAGED_BACKUP);
    if (core.format !== 'lex-corporativo-vault-backup' || core.formatVersion !== 1 || !Array.isArray(core.cases)) {
      throw new Error(DAMAGED_BACKUP);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === DAMAGED_BACKUP) throw error;
    throw new Error(WRONG_PASSWORD);
  }
}
