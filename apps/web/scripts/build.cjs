const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');const APP_DIR = path.resolve(process.cwd(), 'apps/web');
const PROJECT_ROOT = path.resolve(APP_DIR, '..');
const SRC = path.resolve(APP_DIR, 'src');
const DIST = path.resolve(APP_DIR, 'dist');
const ESLIB = path.join(APP_DIR, 'node_modules', 'esbuild', 'bin', 'esbuild');


console.log('🔧 Build: Motion Forge Web (Vanilla JS + esbuild)');

// 1. Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });
console.log('✓ Cleaned dist');

// 2. Bundle JS com esbuild
console.log('📦 Bundling JavaScript com esbuild...');

const entries = [
  'boot.js',
  'app.js',
  'components/viewport.js',
  'components/clip-panel.js',
  'components/character-panel.js',
  'components/camera-selector.js',
  'components/record-controls.js',
  'components/provider-selector.js',
  'components/provider-status.js',
  'components/status-bar.js',
  'components/panel.js',
  'export/glb-export.js',
  'export/clip-baker.js',
  'pose/pose-pipeline.js',
  'pose/provider-wiring.js',
  'pose/clip-playback.js',
];

for (const entry of entries) {
  const srcPath = path.join(SRC, entry);
  const destPath = path.join(DIST, entry);

  if (!fs.existsSync(srcPath)) {
    console.log('⚠ Arquivo não encontrado:', entry);
    continue;
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  try {
    execSync(
      `"${ESLIB}" "${srcPath}" --bundle --outfile="${destPath}" --format=esm --platform=browser ` +
      `--target=es2022 --sourcemap --minify-whitespace ` +
      '--external:three --external:three-stdlib --external:@motion-forge/pose ' +
      '--loader:.ts=ts ' +
      '--jsx=automatic --tsconfig=tsconfig.esbuild.json ',
      { cwd: APP_DIR, stdio: 'pipe' }
    );
    console.log('✓ Bundled:', entry);
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message;
    if (stderr.includes('not allowed')) {
      console.log('⚠ Skipped (eval/CDN issue):', entry);
      fs.copyFileSync(srcPath, destPath);
      console.log('  → Copiado sem bundle:', entry);
    } else {
      console.log('✗ Erro no bundle:', entry);
      console.log('  ', stderr.split('\n')[0]);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copiar CSS
const cssFiles = [
  'app.css',
  'components/panel.css', 'components/status-bar.css', 'components/provider-selector.css',
  'components/provider-status.css', 'components/camera-selector.css', 'components/record-controls.css',
  'components/clip-panel.css', 'components/character-panel.css', 'components/viewport.css',
];

for (const cssFile of cssFiles) {
  const srcPath = path.join(SRC, cssFile);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(DIST, cssFile);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log('✓ CSS:', cssFile);
  }
}

// 4. Copiar pacotes workspace já buildados (dist) para o dist da web
const workspacePkgs = [
  { src: path.join(PROJECT_ROOT, 'packages', 'core', 'dist'), dest: path.join(DIST, 'core') },
  { src: path.join(PROJECT_ROOT, 'packages', 'pose', 'dist'), dest: path.join(DIST, 'pose') },
  { src: path.join(PROJECT_ROOT, 'packages', 'retarget', 'dist'), dest: path.join(DIST, 'retarget') },
];

for (const pkg of workspacePkgs) {
  if (fs.existsSync(pkg.src)) {
    if (fs.existsSync(pkg.dest)) {
      fs.rmSync(pkg.dest, { recursive: true, force: true });
    }
    fs.cpSync(pkg.src, pkg.dest, { recursive: true });
    console.log('✓ Copiado pacote buildado:', path.basename(pkg.src));
  } else {
    console.log('⚠ Pacote não buildado (falta dist):', path.basename(pkg.src));
  }
}

// 5. Copiar modelos 3D
const modelsSrc = path.join(PROJECT_ROOT, 'assets', '3d models template');
const modelsDst = path.join(DIST, 'models');
if (fs.existsSync(modelsSrc)) {
  fs.cpSync(modelsSrc, modelsDst, { recursive: true });
  console.log('✓ Copiados modelos 3D');
}

// 6. Copiar HTML (import map para CDN já está em index.html)
const indexHtmlPath = path.join(APP_DIR, 'index.html');
fs.copyFileSync(indexHtmlPath, path.join(DIST, 'index.html'));
console.log('✓ HTML com import map');

console.log('\n✅ Build complete!');
console.log('📁 Output:', DIST);

// 7. Sanity check: list JS files with module imports that are not bare specifiers
console.log('\n🔎 Verificando imports nos arquivos gerados...');
const jsFiles = fs.readdirSync(DIST).filter(f => f.endsWith('.js'));
for (const file of jsFiles) {
  const content = fs.readFileSync(path.join(DIST, file), 'utf8');
  const bareImports = content.match(/from ['"]([^'"]+)['"]/g) || [];
  for (const imp of bareImports) {
    const pkg = imp.match(/from ['"]([^'"]+)['"]/)[1];
    if (pkg.startsWith('@motion-forge/') || pkg === 'three' || pkg.startsWith('three/') || pkg.startsWith('@mediapipe/')) {
      continue; // esperado, resolvido pelo import map ou copiado
    }
    console.log(`  ⚠️ ${file}: import bare '${pkg}'`);
  }
}
