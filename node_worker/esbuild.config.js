const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/server.js',
  format: 'cjs',
  external: [],
  minify: true,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  // Ensure we handle dynamic requires properly
  mainFields: ['main', 'module'],
  // Keep function names for better debugging
  keepNames: true,
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
