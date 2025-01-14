// esbuild.config.js

import path from 'path';
import { context } from 'esbuild';

const watch = process.argv.includes('--watch');

const escontext = await context({
  entryPoints: ['app/javascript/packs/new-plan.tsx'],
  bundle: true,
  outdir: path.join(process.cwd(), 'app/assets/builds'),
  loader: { '.js': 'jsx', '.ts': 'ts', '.tsx': 'tsx' },
  logLevel: watch ? 'info' : 'default',
  sourcemap: process.env.RAILS_ENV === 'development',
  minify: process.env.RAILS_ENV === 'production',
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
}).catch(() => process.exit(1));

if (!watch) {
  await escontext.rebuild();
  process.exit(0);
} else {
  await escontext.watch().catch(() => process.exit(1));
}