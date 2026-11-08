import fs from 'node:fs';
const HTML=fs.readFileSync(new URL('./src/index.html',import.meta.url),'utf8'),LOGIC=fs.readFileSync(new URL('./src/logic.mjs',import.meta.url),'utf8');
fs.writeFileSync(new URL('./src/assets.mjs',import.meta.url),'export const HTML='+JSON.stringify(HTML)+';\nexport const LOGIC='+JSON.stringify(LOGIC)+';\n');
