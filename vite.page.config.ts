import { defineConfig } from 'vite';

/**
 * Oddelený build pre page-level gmail-scanner.js
 * Tento skript beží v kontexte Gmail stránky (nie extension).
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/page/gmail-scanner.ts',
      output: {
        entryFileNames: 'gmail-scanner.js',
        format: 'iife',
      },
    },
  },
});
