/**
 * Build script for signify-polaris-web from GitHub source
 *
 * This script automatically builds the polaris-web library during npm install.
 *
 * Usage:
 *   - Default: Uses the commit hash defined below (for stability)
 *   - Latest: Run with POLARIS_COMMIT='' npm install
 *   - Custom: Run with POLARIS_COMMIT='commit-hash' npm install
 *
 * The script will:
 *   1. Check if already built (skip if dist exists)
 *   2. Clone the repository from GitHub
 *   3. Checkout specific commit (or use latest)
 *   4. Install dependencies and build
 *   5. Copy build output to node_modules
 *   6. Clean up temporary files
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const polarisDir = join(rootDir, 'node_modules', 'signify-polaris-web');
const polarisDistDir = join(polarisDir, 'dist');

// Pinned to the same commit used in services/libs/polaris-web
const POLARIS_COMMIT = process.env.POLARIS_COMMIT !== undefined
  ? process.env.POLARIS_COMMIT
  : '7d7dd1344f435ea6bc09c63fe013dda0afe84ada';

console.log('Checking signify-polaris-web build status...');
if (POLARIS_COMMIT) {
  console.log(`Target commit: ${POLARIS_COMMIT}`);
} else {
  console.log('Target: latest from main branch');
}

if (existsSync(polarisDistDir)) {
  console.log('✓ signify-polaris-web already built');
  process.exit(0);
}

console.log('Building signify-polaris-web from GitHub source...');

try {
  const tempDir = join(rootDir, '.temp-polaris-build');

  if (POLARIS_COMMIT) {
    console.log('Cloning repository...');
    execSync('git clone https://github.com/WebOfTrust/polaris-web.git .temp-polaris-build', {
      cwd: rootDir,
      stdio: 'inherit'
    });

    console.log(`Checking out commit ${POLARIS_COMMIT}...`);
    execSync(`git checkout ${POLARIS_COMMIT}`, {
      cwd: tempDir,
      stdio: 'inherit'
    });
  } else {
    console.log('Cloning repository (latest from main)...');
    execSync('git clone --depth 1 --branch main https://github.com/WebOfTrust/polaris-web.git .temp-polaris-build', {
      cwd: rootDir,
      stdio: 'inherit'
    });
  }

  console.log('Installing dependencies...');
  execSync('npm install', {
    cwd: tempDir,
    stdio: 'inherit'
  });

  console.log('Building...');
  execSync('npm run build', {
    cwd: tempDir,
    stdio: 'inherit'
  });

  console.log('Copying build output and package files...');

  if (!existsSync(polarisDistDir)) {
    mkdirSync(polarisDistDir, { recursive: true });
  }

  execSync(`cp -r ${join(tempDir, 'dist')}/* ${polarisDistDir}/`, { stdio: 'inherit' });
  execSync(`cp ${join(tempDir, 'package.json')} ${polarisDir}/`, { stdio: 'inherit' });
  execSync(`cp ${join(tempDir, 'README.md')} ${polarisDir}/ 2>/dev/null || true`, { stdio: 'inherit' });
  execSync(`cp ${join(tempDir, 'LICENSE')} ${polarisDir}/ 2>/dev/null || true`, { stdio: 'inherit' });
  execSync(`cp -r ${join(tempDir, 'src')} ${polarisDir}/`, { stdio: 'inherit' });

  console.log('Cleaning up...');
  execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' });

  console.log('✓ signify-polaris-web built successfully');
} catch (error) {
  console.error('Failed to build signify-polaris-web:', error.message);
  process.exit(1);
}
