// Seed the SETIH event into the online Firestore via the deployed API.
// Usage: node scripts/seed-setih.mjs <adminPassword> [baseUrl]
//    or: ADMIN_TOKEN=<hmac> node scripts/seed-setih.mjs
//
// Structure: 56 équipes (4 couleurs × A→N), vote désactivé, 4 épreuves :
//   Fun Flasher (points libres), Water Challenge / Nerf / Dépollution
//   (points prédéfinis 600→0). Classement global = somme des 4 épreuves.

const BASE = (process.argv[3] || 'https://banascore.web.app').replace(/\/$/, '');
const PASSWORD = process.argv[2];
if (!PASSWORD && !process.env.ADMIN_TOKEN) {
  console.error('Provide a password arg or ADMIN_TOKEN env.');
  process.exit(1);
}

let TOKEN = '';
async function api(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'x-admin-token': TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const COLORS = ['Rouge', 'Bleu', 'Vert', 'Jaune'];
const LETTERS = 'ABCDEFGHIJKLMNOP'.split(''); // A → P (16, en 2 demi-groupes de 8)
const PRESET = [600, 500, 400, 300, 200, 100, 0];
const ACTIVITIES = [
  { name: 'Fun Flasher', mode: 'free' },
  { name: 'Water Challenge', mode: 'preset', preset: PRESET },
  { name: 'Nerf', mode: 'preset', preset: PRESET },
  { name: 'Dépollution', mode: 'preset', preset: PRESET },
];

async function main() {
  if (process.env.ADMIN_TOKEN) {
    TOKEN = process.env.ADMIN_TOKEN.trim();
  } else {
    ({ token: TOKEN } = await api('POST', '/admin/login', { password: PASSWORD }));
  }
  console.log('Connecté. Création de SETIH…');

  const { id } = await api('POST', '/events', { name: 'SETIH', date: null, location: null });

  // Disable public voting (scoring-only event).
  await api('PATCH', `/events/${id}`, {
    name: 'SETIH',
    date: null,
    location: null,
    status: 'open',
    maxVotes: 3,
    votingEnabled: false,
    rankingMode: 'raw',
    workshopWeights: null,
    brandColor: null,
    logoUrl: null,
    scorerCode: null,
  });

  for (const a of ACTIVITIES) {
    const act = await api('POST', `/events/${id}/activities`, { name: a.name });
    if (a.mode === 'free') {
      await api('PATCH', `/activities/${act.id}`, { scoringMode: 'free' });
    } else {
      await api('PATCH', `/activities/${act.id}`, { scoringMode: 'preset', presetPoints: a.preset });
    }
    console.log(`  ✓ épreuve « ${a.name} » (${a.mode})`);
  }

  let n = 0;
  for (const color of COLORS) {
    for (const letter of LETTERS) {
      await api('POST', `/events/${id}/teams`, { name: `${color} ${letter}` });
      n++;
    }
    console.log(`  ✓ ${color} : ${LETTERS.length} équipes`);
  }

  console.log(`\nTerminé. Événement SETIH [${id}] : ${n} équipes, ${ACTIVITIES.length} épreuves.`);
}

main().catch((e) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
