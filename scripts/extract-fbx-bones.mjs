// Extracts the bone hierarchy from an FBX binary by walking node headers only.
// Property bytes are skipped entirely (they may be zlib-compressed).
// Usage: node scripts/extract-fbx-bones.mjs <file.fbx>
import { readFileSync } from "node:fs";

const path = process.argv[2];
const buf = readFileSync(path);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// Header: "Kaydara FBX Binary  \x00\x1A\x00" = 23 bytes, then u32 version.
let pos = 27;
const version = dv.getUint32(23, true);
if (version >= 7500) pos += 4; // 64-bit offsets use u32 null terminator in header
console.log(`FBX version ${version} (${version >= 7500 ? "64" : "32"}-bit offsets)`);

const nodes = [];
function readString(off, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(buf[off + i]);
  return s;
}

function walk(end) {
  while (pos < end) {
    const start = pos;
    let endOffset, numProps, propLen;
    if (version >= 7500) {
      endOffset = Number(dv.getBigUint64(pos, true));
      numProps = Number(dv.getBigUint64(pos + 8, true));
      const nameLen = buf[pos + 24];
      const name = readString(pos + 25, nameLen);
      pos = pos + 25 + nameLen;
      propLen = Number(dv.getBigUint64(pos, true));
      pos += 8 + propLen;
      nodes.push({ name, numProps, start });
    } else {
      endOffset = dv.getUint32(pos, true);
      numProps = dv.getUint32(pos + 4, true);
      propLen = dv.getUint32(pos + 8, true);
      const nameLen = buf[pos + 12];
      const name = readString(pos + 13, nameLen);
      if (endOffset === 0) break; // null record
      pos = pos + 13 + nameLen;
      pos += propLen; // skip all property bytes (may be compressed)
      nodes.push({ name, numProps, start });
    }
    if (endOffset === 0 || endOffset > end) break;
    // Recurse into children region (between props end and endOffset)
    if (pos < endOffset) {
      walk(endOffset);
    }
    pos = endOffset;
  }
}

walk(buf.length);
console.log("total nodes:", nodes.length);
const names = new Set(nodes.map((n) => n.name));
console.log("unique node names:", [...names].sort().join(", ").slice(0, 600));
