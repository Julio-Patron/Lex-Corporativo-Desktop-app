import { ipcMain } from './trusted-ipc';
import { getLegalCorpusOverview } from '../lib/legal-corpus';

// La interfaz sólo lista las leyes instaladas y enlaza su texto oficial; el texto completo
// del corpus no se expone al renderer.
export function registerCorpusHandlers(): void {
  ipcMain.handle('corpus:list', () => getLegalCorpusOverview());
}
