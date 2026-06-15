// Seed the Stallergix structure into the online Firestore via the deployed API.
// Usage: node scripts/seed-stallergix.mjs <adminPassword> [baseUrl]
// Mirrors the structure validated on the LAN tablets. Everything created here
// stays editable in the admin UI afterwards (team names, criteria, points...).

const BASE = (process.argv[3] || 'https://banascore.web.app').replace(/\/$/, '');
const PASSWORD = process.argv[2];
if (!PASSWORD && !process.env.ADMIN_TOKEN) {
  console.error('Provide a password arg or ADMIN_TOKEN env. Usage: node scripts/seed-stallergix.mjs <password> [baseUrl]');
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

// One workshop "atelier" = name + scoring_mode + criteria list.
const ACTIVITIES = [
  { name: 'Quiz', workshop: 'Quiz', mode: 'free', criteria: [] },
  { name: 'Aqueduc', workshop: 'Aqueduc', mode: 'criteria', criteria: [['Réussi', 3000]] },
  {
    name: 'Goûter',
    workshop: 'Sensoriel',
    mode: 'criteria',
    criteria: [['Insecte mangé', 1000], ['Goût trouvé', 2000]],
  },
  { name: 'Sentir', workshop: 'Sensoriel', mode: 'criteria', criteria: [['Trouvé', 2000]] },
  { name: 'Voir', workshop: 'Sensoriel', mode: 'criteria', criteria: [['Trouvé', 2000]] },
  { name: 'Toucher', workshop: 'Sensoriel', mode: 'criteria', criteria: [['Trouvé', 2000]] },
];

async function createStallergixEvent(name, teamCount) {
  const { id } = await api('POST', '/events', { name, date: null, location: null });
  for (const a of ACTIVITIES) {
    const act = await api('POST', `/events/${id}/activities`, { name: a.name, workshop: a.workshop });
    if (a.mode === 'free') await api('PATCH', `/activities/${act.id}`, { scoringMode: 'free' });
    for (const [label, points] of a.criteria) {
      await api('POST', `/activities/${act.id}/criteria`, { label, points });
    }
  }
  for (let i = 1; i <= teamCount; i++) {
    await api('POST', `/events/${id}/teams`, { name: `Équipe ${i}` });
  }
  console.log(`  ✓ [${id}] ${name} (${teamCount} équipes)`);
  return id;
}

async function main() {
  if (process.env.ADMIN_TOKEN) {
    TOKEN = process.env.ADMIN_TOKEN.trim();
    console.log('Jeton admin fourni. Création de la structure Stallergix…');
  } else {
    ({ token: TOKEN } = await api('POST', '/admin/login', { password: PASSWORD }));
    console.log('Connecté. Création de la structure Stallergix…');
  }
  await createStallergixEvent('Stallergix — modèle', 0);
  for (let n = 1; n <= 5; n++) await createStallergixEvent(`Stallergix S${n}`, 12);
  const events = await api('GET', '/events?all=1');
  console.log(`\nTerminé. ${events.length} événement(s) en ligne.`);
}

main().catch((e) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
