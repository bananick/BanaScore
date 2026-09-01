/*
 * Seed de l'événement « Team Building IFP School » : 24 équipes (6 groupes),
 * 6 ateliers + course d'orientation, votes désactivés, code animateur.
 *
 *   node scripts/seed-ifp.cjs           # crée l'événement (ou l'affiche s'il existe)
 *   node scripts/seed-ifp.cjs --reset   # supprime puis recrée (⚠ efface les scores)
 *
 * La logique de notation (barème, rotations, course) vit côté app (src/ifp.ts) ;
 * ce script ne fait que préparer les données. Le total mondial = somme des
 * points des 7 épreuves (votes/bonus à 0).
 */
const path = require('path');
const crypto = require('crypto');

// Permet de charger les modules serveur écrits en TypeScript.
require('ts-node').register({
  project: path.resolve(__dirname, '../tsconfig.node.json'),
  transpileOnly: true,
});

const db = require('../server/db').default;
const store = require('../server/store');

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
const ATELIERS = ['Water Challenge', 'AthléTower', 'Jeux de Billes', 'PassBall', 'FunFlasher', 'LaserGame'];
const COURSE_NAME = "Course d'orientation";

function main() {
  const reset = process.argv.includes('--reset');

  const existing = store.listEvents(db).find((e) => e.name === EVENT_NAME);
  if (existing && !reset) {
    console.log(`ℹ️  L'événement « ${EVENT_NAME} » existe déjà (id ${existing.id}).`);
    console.log('   Relancez avec --reset pour le supprimer et le recréer (⚠ efface les scores).');
    return;
  }
  if (existing && reset) {
    store.deleteEvent(db, existing.id);
    console.log(`🗑️  Ancien événement supprimé (id ${existing.id}).`);
  }

  const tx = db.transaction(() => {
    const { id: eventId } = store.createEvent(db, {
      name: EVENT_NAME,
      date: null,
      location: 'IFP School',
    });

    // Config : votes désactivés, classement brut (somme), code animateur.
    store.updateEvent(db, eventId, {
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

    // 24 équipes avec leur groupe (INSERT direct pour poser team_group).
    const insertTeam = db.prepare(
      'INSERT INTO teams (name, event_id, qr_token, team_group) VALUES (?, ?, ?, ?)',
    );
    let teamCount = 0;
    for (const group of Object.keys(GROUP_TEAMS)) {
      for (const name of GROUP_TEAMS[group]) {
        insertTeam.run(name, eventId, crypto.randomBytes(16).toString('hex'), group);
        teamCount++;
      }
    }

    // 7 épreuves : 6 ateliers (workshop = nom) + course d'orientation.
    const names = [...ATELIERS, COURSE_NAME];
    for (const name of names) {
      const { id: actId } = store.createActivity(db, eventId, name, name);
      store.updateActivity(db, actId, { scoringMode: 'free', coefficient: 1, workshop: name });
    }

    return { eventId, teamCount, activityCount: names.length };
  });

  const { eventId, teamCount, activityCount } = tx();

  console.log('✅ Événement créé.');
  console.log(`   • id            : ${eventId}`);
  console.log(`   • équipes       : ${teamCount} (6 groupes A–F)`);
  console.log(`   • épreuves      : ${activityCount} (6 ateliers + course)`);
  console.log(`   • code animateur: ${SCORER_CODE}`);
  console.log('');
  console.log('   Notation animateur : /score/' + eventId);
  console.log('   Podium (projection): /event/' + eventId + '/board');
  console.log('   Classement global  : /event/' + eventId + '/ranking/global');
}

main();
