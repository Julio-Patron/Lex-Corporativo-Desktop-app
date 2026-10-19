import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { CONTENT_SECURITY_POLICY_META, contentSecurityPolicyMeta } from './src/shared/content-security-policy';

export default defineConfig(({ command }) => {
  const reactPreambleHash = command === 'serve'
    ? createHash('sha256').update(react.preambleCode.replace('__BASE__', '/')).digest('base64')
    : undefined;
  // Electron hereda el hash calculado con la versión instalada del plugin.
  // La meta y el encabezado deben autorizar el mismo script.
  if (reactPreambleHash) process.env.LEX_DEV_REACT_PREAMBLE_HASH = reactPreambleHash;
  else delete process.env.LEX_DEV_REACT_PREAMBLE_HASH;

  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'pdf-worker': resolve(__dirname, 'src/main/lib/pdf-worker.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react(), {
      name: 'lex-dev-react-csp',
      apply: 'serve',
      transformIndexHtml(html) {
        return html.replace(CONTENT_SECURITY_POLICY_META, contentSecurityPolicyMeta(reactPreambleHash));
      },
    }],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        },
        output: {
          // Embeddings, PDF y Word se procesan en el proceso principal; el renderer
          // sólo carga docx y jspdf bajo demanda al exportar.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          }
        }
      }
    }
  }
  };
});
