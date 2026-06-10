// One-command launch for running an event:
//   npm start
// Builds the app if needed, then starts the server bound to the LAN and prints
// the address (and QR page) that tablets/phones should open.
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 3001;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function lanIp() {
  const cands = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) cands.push(ni.address);
    }
  }
  return (
    cands.find((a) => a.startsWith('192.168.')) ||
    cands.find((a) => a.startsWith('10.')) ||
    cands.find((a) => /^172\.(1[6-9]|2\d|3[01])\./.test(a)) ||
    cands[0] ||
    'localhost'
  );
}

// Build the frontend if it hasn't been built yet.
if (!fs.existsSync(path.resolve('dist', 'index.html'))) {
  console.log("Construction de l'application (npm run build)…");
  const build = spawnSync(npm, ['run', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
}

const url = `http://${lanIp()}:${PORT}`;
const line = '='.repeat(54);
console.log(`\n${line}`);
console.log('  🍌 BanaScore — prêt pour l’événement');
console.log('');
console.log('  Sur chaque tablette (même Wi-Fi), ouvrez :');
console.log(`    ${url}`);
console.log('');
console.log('  QR d’accès à afficher sur le PC pour les tablettes :');
console.log(`    ${url}/access`);
console.log(`${line}\n`);

const server = spawn(npm, ['run', 'server'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});
server.on('exit', (code) => process.exit(code || 0));

// Open the QR/access page on this PC once the server has had time to boot, so
// the organiser just has tablets scan the on-screen QR (no terminal needed).
const accessUrl = `http://localhost:${PORT}/access`;
setTimeout(() => {
  const opener =
    process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(`${opener} "${accessUrl}"`, { shell: true, stdio: 'ignore' }).on('error', () => undefined);
}, 3500);
