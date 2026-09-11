const fs = require('fs');

const files = [
  'dist/app.js',
  'dist/boot.js',
  'dist/components/viewport.js',
  'dist/components/clip-panel.js',
  'dist/components/character-panel.js',
  'dist/components/camera-selector.js',
  'dist/components/record-controls.js',
  'dist/components/provider-selector.js',
  'dist/components/provider-status.js',
  'dist/components/status-bar.js',
  'dist/components/panel.js',
  'dist/pose/pose-pipeline.js',
  'dist/pose/provider-wiring.js',
  'dist/pose/clip-playback.js',
  'dist/export/glb-export.js',
  'dist/export/clip-baker.js',
];

function run() {
  for (const p of files) {
    if (!fs.existsSync(p)) {
      console.log('MISSING', p);
      continue;
    }
    const s = fs.readFileSync(p, 'utf8');
    const raw = s.match(/from ["']([^"']+)["']/g) || [];
    const bare = [];
    for (const x of raw) {
      const m = x.match(/from ["']([^"']+)["']/);
      if (m) {
        const spec = m[1];
        if (!spec.startsWith('./') && !spec.startsWith('../')) {
          bare.push(spec);
        }
      }
    }
    if (bare.length > 0) {
      console.log('BARE in', p + ':');
      bare.forEach(b => console.log('  ', b));
    } else {
      console.log('OK  ', p, '(size', s.length, ')');
    }
  }
}

run();
