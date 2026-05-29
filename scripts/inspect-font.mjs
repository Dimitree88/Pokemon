// Inspector minimale per font TTF/OTF: dumpa la cmap (codepoint -> glyphId) e i
// nomi glifo dalla tabella 'post' (format 2). Nessuna dipendenza.
// Uso: node scripts/inspect-font.mjs "<path al .ttf>"

import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) { console.error("uso: node scripts/inspect-font.mjs <font.ttf>"); process.exit(1); }

const buf = await readFile(file);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const u16 = (o) => dv.getUint16(o);
const i16 = (o) => dv.getInt16(o);
const u32 = (o) => dv.getUint32(o);

// --- offset table / table directory ---
const numTables = u16(4);
const tables = {};
let p = 12;
for (let i = 0; i < numTables; i++) {
  const tag = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
  tables[tag] = { offset: u32(p + 8), length: u32(p + 12) };
  p += 16;
}

// --- cmap: scegli una subtable Unicode ---
function parseCmap() {
  const base = tables["cmap"].offset;
  const n = u16(base + 2);
  let best = null;
  for (let i = 0; i < n; i++) {
    const rec = base + 4 + i * 8;
    const platform = u16(rec), enc = u16(rec + 2), off = u32(rec + 4);
    const score =
      (platform === 3 && enc === 10) ? 5 :
      (platform === 3 && enc === 1) ? 4 :
      (platform === 0) ? 3 :
      (platform === 3 && enc === 0) ? 2 : 1;
    if (!best || score > best.score) best = { score, off: base + off, platform, enc };
  }
  const o = best.off;
  const format = u16(o);
  const map = new Map(); // codepoint -> glyphId
  if (format === 4) {
    const segX2 = u16(o + 6), segCount = segX2 / 2;
    const endO = o + 14;
    const startO = endO + segX2 + 2;
    const deltaO = startO + segX2;
    const rangeO = deltaO + segX2;
    for (let s = 0; s < segCount; s++) {
      const end = u16(endO + s * 2);
      const start = u16(startO + s * 2);
      const delta = i16(deltaO + s * 2);
      const rangeOff = u16(rangeO + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g;
        if (rangeOff === 0) g = (c + delta) & 0xffff;
        else {
          const gi = u16(rangeO + s * 2 + rangeOff + (c - start) * 2);
          g = gi === 0 ? 0 : (gi + delta) & 0xffff;
        }
        if (g !== 0) map.set(c, g);
      }
    }
  } else if (format === 12) {
    const nGroups = u32(o + 12);
    let g = o + 16;
    for (let i = 0; i < nGroups; i++) {
      const startC = u32(g), endC = u32(g + 4), startG = u32(g + 8);
      for (let c = startC; c <= endC; c++) map.set(c, startG + (c - startC));
      g += 12;
    }
  } else {
    console.error("cmap format non gestito:", format);
  }
  return { map, format, platform: best.platform, enc: best.enc };
}

// --- post format 2: nomi glifo ---
const MAC_GLYPHS = null; // non serve per format 2 con nomi custom
function parsePostNames(numGlyphs) {
  if (!tables["post"]) return null;
  const o = tables["post"].offset;
  const ver = u32(o);
  if (ver !== 0x00020000) return null; // solo format 2.0
  const num = u16(o + 32);
  let q = o + 34;
  const indices = [];
  for (let i = 0; i < num; i++) { indices.push(u16(q)); q += 2; }
  const names = [];
  // i nomi custom (indice >= 258) sono Pascal strings consecutive
  const end = o + tables["post"].length;
  while (q < end) {
    const len = buf[q]; q += 1;
    names.push(String.fromCharCode(...buf.subarray(q, q + len)));
    q += len;
  }
  const out = new Map(); // glyphId -> name
  for (let gid = 0; gid < indices.length; gid++) {
    const idx = indices[gid];
    if (idx >= 258) out.set(gid, names[idx - 258] ?? `g${gid}`);
    else out.set(gid, `mac#${idx}`);
  }
  return out;
}

const numGlyphs = tables["maxp"] ? u16(tables["maxp"].offset + 4) : 0;
const { map, format, platform, enc } = parseCmap();
const names = parsePostNames(numGlyphs);

console.log(`# ${file}`);
console.log(`tabelle: ${Object.keys(tables).join(", ")}`);
console.log(`numGlyphs=${numGlyphs}  cmap format=${format} platform=${platform} enc=${enc}  mappature=${map.size}`);
console.log(`# codepoint  char  glyphId  nomeGlifo`);

const entries = [...map.entries()].sort((a, b) => a[0] - b[0]);
for (const [cp, gid] of entries) {
  const ch = cp >= 0x20 && cp !== 0x7f ? String.fromCodePoint(cp) : "·";
  const nm = names?.get(gid) ?? "";
  console.log(`U+${cp.toString(16).toUpperCase().padStart(4, "0")}  '${ch}'  ${String(gid).padStart(4)}  ${nm}`);
}
