export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.docx,.doc,.xml,.txt,.md';
export const ACCEPTED_DOCUMENT_LABEL = 'PDF, Word, XML (CFDI), TXT o Markdown · hasta 20 MB';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xml', '.txt', '.md'];

export function validateDocumentFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Formato no compatible. Usa PDF, Word, XML (CFDI), TXT o Markdown.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'El archivo supera el límite de 20 MB.';
  }
  return null;
}

export function resolveMimeType(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.xml')) return 'application/xml';
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.doc')) return 'application/msword';
  return file.type || 'application/octet-stream';
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export async function toFilePayload(file: File): Promise<{ name: string; mimeType: string; base64: string }> {
  return { name: file.name, mimeType: resolveMimeType(file), base64: await readFileAsBase64(file) };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
