const fs = require('fs');
const path = require('path');

const pkgs = ['core','pose','retarget'];
const RE_REL = /^from\s+["']\.\/?["']$/;
for (const p of pkgs) {
  const distDir = path.resolve('packages', p, 'dist');
  try {
    const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
    console.log('##', p, 'dist JS files:');
    files.forEach(f => {
      const fp = path.join(distDir, f);
      const s = fs.readFileSync(fp,'utf8');
      const m = (s.match(/from ["']([^"']+)["']/g) || []);
      const nonRelative = m.filter(x => {
        const spec = x.match(/from\s+["']([^"']+)["']/)[1];
        return !spec.startsWith('./') && !spec.startsWith('../');
      });
      console.log('  ', f, '(size', s.length, ')', nonRelative.length > 0 ? 'BARE: ' + JSON.stringify(nonRelative) : '');
    });
  } catch(e) { console.log(p, 'NO DIST', e.message); }
}
