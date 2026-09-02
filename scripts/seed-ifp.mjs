// Seed de l'événement « Team Building IFP School » dans le Firestore en ligne,
// via l'API déployée (comme seed-setih.mjs).
//
// Usage : node scripts/seed-ifp.mjs <adminPassword> [baseUrl]
//    ou : ADMIN_TOKEN=<hmac> node scripts/seed-ifp.mjs '' [baseUrl]
//
// Structure : 24 équipes (capitales, 6 groupes A→F), vote désactivé, 7 épreuves
// (6 ateliers + course d'orientation). Le groupe de chaque équipe est déduit de
// son nom côté app (src/ifp.ts) — rien à stocker en base.
//
// Notation (appliquée par l'app, pas par ce seed) :
//   - ateliers classés : barème 10000/9000/8000/7500 ;
//   - FunFlasher : points bruts 7500–10000 ;
//   - course : positions 1→24 → barème 40000→~26000 ;
//   - total mondial = somme des 7 épreuves (60% ateliers + 40% course).

const BASE = (process.argv[3] || 'https://banascore.web.app').replace(/\/$/, '');
const PASSWORD = process.argv[2];
if (!PASSWORD && !process.env.ADMIN_TOKEN) {
  console.error('Fournir le mot de passe admin en argument, ou ADMIN_TOKEN en variable.');
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

const EVENT_NAME = 'Team Building IFP School';
const SCORER_CODE = 'IFP2026';

const GROUP_TEAMS = {
  A: ['ABUJA', 'ALGER', 'AMSTERDAM', 'ASTANA'],
  B: ['BAKOU', 'BANGKOK', 'BEYROUTH', 'BOGOTA'],
  C: ['BRASILIA', 'BRUXELLES', 'BUCAREST', 'DAKAR'],
  D: ['ISLAMABAD', 'KINSHASA', 'LJUBLJANA', 'MADRID'],
  E: ['NEW DELHI', 'PARIS', 'RABAT', 'ROME'],
  F: ['SEOUL', 'WINDHOEK', 'YAMOUSSOUKRO', 'YAOUNDE'],
};

// Ordre = index du carré latin (voir src/ifp.ts). La course vient en 7e.
const ACTIVITIES = ['Water Challenge', 'AthléTower', 'Jeux de Billes', 'PassBall', 'FunFlasher', 'LaserGame', "Course d'orientation"];

async function main() {
  if (process.env.ADMIN_TOKEN) {
    TOKEN = process.env.ADMIN_TOKEN.trim();
  } else {
    ({ token: TOKEN } = await api('POST', '/admin/login', { password: PASSWORD }));
  }
  console.log(`Connecté sur ${BASE}.`);

  // Anti-doublon : refuse si un événement du même nom existe déjà.
  const events = await api('GET', '/events?all=1');
  if (Array.isArray(events) && events.some((e) => e.name === EVENT_NAME)) {
    const ex = events.find((e) => e.name === EVENT_NAME);
    console.error(`\n⚠  L'événement « ${EVENT_NAME} » existe déjà (id ${ex.id}). Abandon.`);
    console.error('   Supprime-le d\'abord dans l\'admin si tu veux le recréer.');
    process.exit(1);
  }

  const { id } = await api('POST', '/events', { name: EVENT_NAME, date: null, location: 'IFP School' });

  // Vote public désactivé, classement brut (somme), code animateur.
  await api('PATCH', `/events/${id}`, {
    name: EVENT_NAME,
    date: null,
    location: 'IFP School',
    status: 'open',
    maxVotes: 3,
    votingEnabled: false,
    rankingMode: 'raw',
    workshopWeights: null,
    brandColor: null,
    logoUrl: null,
    scorerCode: SCORER_CODE,
  });

  for (const name of ACTIVITIES) {
    const act = await api('POST', `/events/${id}/activities`, { name, workshop: name });
    await api('PATCH', `/activities/${act.id}`, { scoringMode: 'free', workshop: name });
    console.log(`  ✓ épreuve « ${name} »`);
  }

  let n = 0;
  for (const group of Object.keys(GROUP_TEAMS)) {
    for (const name of GROUP_TEAMS[group]) {
      await api('POST', `/events/${id}/teams`, { name });
      n++;
    }
    console.log(`  ✓ groupe ${group} : ${GROUP_TEAMS[group].join(', ')}`);
  }

  console.log(`\n✅ Événement « ${EVENT_NAME} » [id ${id}] : ${n} équipes, ${ACTIVITIES.length} épreuves.`);
  console.log(`   Code animateur : ${SCORER_CODE}`);
  console.log(`   Notation  : ${BASE}/score/${id}`);
  console.log(`   Podium    : ${BASE}/event/${id}/board`);
  console.log(`   Classement: ${BASE}/event/${id}/ranking/global`);
}

main().catch((e) => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
