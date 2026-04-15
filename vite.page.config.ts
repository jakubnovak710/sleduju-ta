import { defineConfig } from 'vite';

/**
 * Oddelený build pre page-level gmail-scanner.js
 * Tento skript beží v kontexte Gmail stránky (nie extension).
 */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/page/gmail-scanner.ts',
      name: 'GmailScanner',
      fileName: () => 'gmail-scanner.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
