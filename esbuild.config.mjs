import path from 'path';
import { context } from 'esbuild';
import glob from 'tiny-glob';

const watch = process.argv.includes('--watch');

const escontext = await context({
  entryPoints: await glob("./app/javascript/packs/*.ts*"),
  bundle: true,
  outdir: path.join(process.cwd(), 'app/assets/builds'),
  loader: { '.js': 'jsx', '.ts': 'ts', '.tsx': 'tsx' },
  logLevel: watch ? 'info' : 'debug',
  sourcemap: process.env.RAILS_ENV === 'development',
  minify: process.env.RAILS_ENV === 'production',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact',
  jsx: 'automatic',
  alias: {
    'react': 'preact/compat',
    'react-dom': 'preact/compat',
  },
}).catch((e) => {
  console.error(e);
  process.exit(1)
});

if (!watch) {
  await escontext.rebuild();
  process.exit(0);
} else {
  await escontext.watch().catch(() => process.exit(1));
}