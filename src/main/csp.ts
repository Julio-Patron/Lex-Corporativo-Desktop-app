import { session, type Session } from 'electron';
import { withContentSecurityPolicy } from '../shared/content-security-policy';

let installed = false;

/**
 * El encabezado no alcanza a un documento file://. Ese caso queda cubierto por la meta del HTML.
 * Registrar el listener más de una vez duplicaría el callback en cada respuesta.
 */
export function installContentSecurityPolicy(target: Session = session.defaultSession): void {
  if (installed) return;
  installed = true;
  target.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: withContentSecurityPolicy(details.responseHeaders) });
  });
}
