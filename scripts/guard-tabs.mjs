import fs from 'fs';

const p = new URL('../src/app/pages/AdminPanel.tsx', import.meta.url);
let s = fs.readFileSync(p, 'utf8');
const before = (s.match(/\{tab === '/g) || []).length;
s = s.replaceAll("{tab === '", "{canAccess(tab) && tab === '");
fs.writeFileSync(p, s);
console.log('replaced', before);
