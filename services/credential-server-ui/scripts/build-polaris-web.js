/**
 * Build script for signify-polaris-web
 *
 * npm installs only the dist files for the GitHub dependency (per its "files"
 * field), so the source is not available to build in-place. This script clones
 * the source, compiles it with the TypeScript already present in this project,
 * and copies the output into node_modules — no separate npm install is needed
 * inside the cloned repo.
 *
 * Usage:
 *   Runs automatically via postinstall.
 *   Set POLARIS_REBUILD=1 to force a rebuild even if dist already exists.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const polarisDir = join(rootDir, 'node_modules', 'signify-polaris-web');
const polarisDistDir = join(polarisDir, 'dist');
const tempDir = join(rootDir, '.temp-polaris-build');
const tscBin = join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

const POLARIS_COMMIT = process.env.POLARIS_COMMIT !== undefined
  ? process.env.POLARIS_COMMIT
  : '3bb72199760ce6b9f6187058dc99bf4bd0a8e74e';

if (existsSync(polarisDistDir) && !process.env.POLARIS_REBUILD) {
  console.log('✓ signify-polaris-web already built');
  process.exit(0);
}

console.log(`Building signify-polaris-web @ ${POLARIS_COMMIT || 'latest'}...`);

try {
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });

  if (POLARIS_COMMIT) {
    execSync(
      'git clone --filter=blob:none https://github.com/WebOfTrust/polaris-web.git .temp-polaris-build',
      { cwd: rootDir, stdio: 'inherit' }
    );
    execSync(`git checkout ${POLARIS_COMMIT}`, { cwd: tempDir, stdio: 'inherit' });
  } else {
    execSync(
      'git clone --depth 1 --branch main https://github.com/WebOfTrust/polaris-web.git .temp-polaris-build',
      { cwd: rootDir, stdio: 'inherit' }
    );
  }

  console.log('Patching tsconfig for build...');
  const tsconfigBuildPath = join(tempDir, 'tsconfig.build.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigBuildPath, 'utf8'));
  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
  tsconfig.compilerOptions.skipLibCheck = true;
  // Use this project's @types — no npm install needed inside the clone.
  tsconfig.compilerOptions.typeRoots = [join(rootDir, 'node_modules', '@types')];
  writeFileSync(tsconfigBuildPath, JSON.stringify(tsconfig, null, 2));

  console.log('Building...');
  execSync(`node "${tscBin}" -p tsconfig.build.json`, { cwd: tempDir, stdio: 'inherit' });

  console.log('Copying dist...');
  mkdirSync(polarisDistDir, { recursive: true });
  execSync(`cp -r ${join(tempDir, 'dist')}/* ${polarisDistDir}/`);
  execSync(`cp ${join(tempDir, 'package.json')} ${polarisDir}/`);

  console.log('Cleaning up...');
  rmSync(tempDir, { recursive: true, force: true });

  console.log('✓ signify-polaris-web built successfully');
} catch (error) {
  console.error('Failed to build signify-polaris-web:', error.message);
  process.exit(1);
}
