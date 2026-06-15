/**
 * Centralised French UI strings. Keeping all copy in one place makes the
 * interface consistent and a future multi-language setup straightforward.
 */
export const t = {
  appTagline: 'La façon la plus fun de voter à vos événements !',
  openEvents: 'Événements ouverts',
  noEvents: 'Aucun événement pour le moment.',
  adminDashboard: 'Espace admin',
  home: 'Accueil',

  // Admin login
  adminTitle: 'Administration',
  password: 'Mot de passe',
  login: 'Se connecter',
  logout: 'Se déconnecter',
  wrongPassword: 'Mot de passe incorrect.',
  loginRequired: 'Connexion administrateur requise.',

  // Change password
  changePassword: 'Changer le mot de passe',
  currentPassword: 'Mot de passe actuel',
  newPassword: 'Nouveau mot de passe',
  confirmPassword: 'Confirmer le nouveau mot de passe',
  passwordChanged: 'Mot de passe mis à jour.',
  passwordsDontMatch: 'Les mots de passe ne correspondent pas.',
  passwordTooShort: 'Le nouveau mot de passe doit faire au moins 4 caractères.',

  // Events
  createEvent: 'Créer un événement',
  eventName: 'Nom de l’événement',
  eventDate: 'Date (optionnel)',
  eventLocation: 'Lieu (optionnel)',
  create: 'Créer',
  existingEvents: 'Événements existants',
  save: 'Enregistrer',
  cancel: 'Annuler',
  edit: 'Modifier',
  status: 'Statut',
  statusOpen: 'Ouvert',
  statusClosed: 'Fermé',
  statusArchived: 'Archivé',

  // Event management
  eventManagement: 'Gestion de l’événement',
  eventSettings: 'Paramètres de l’événement',
  linksTools: 'Classements, projection & outils',
  addTeam: 'Ajouter une équipe',
  teamName: 'Nom de l’équipe',
  addActivity: 'Ajouter une activité',
  activityName: 'Nom de l’activité (ex. Quiz, Sport)',
  scoringMode: 'Mode de notation',
  selectActivity: 'Choisir une activité à noter',
  scoreModeLabel: 'Type de notation',
  scoreModeCriteria: 'Critères (cases à cocher)',
  scoreModeFree: 'Points libres (ex. Kahoot)',
  criteria: 'Critères',
  addCriterion: 'Ajouter un critère',
  criterionLabel: 'Libellé (ex. Goût trouvé)',
  criterionPoints: 'Points',
  noCriteria: 'Aucun critère défini.',
  enterPoints: 'Entrer les points',
  resetScores: 'Réinitialiser les scores',
  resetScoresConfirm:
    'Effacer TOUS les scores de cette session ? Les équipes et activités sont conservées. Action irréversible.',
  scoresReset: 'Scores réinitialisés.',
  distributePoints: (n: number) => `Distribuer les points (1 à ${n})`,
  selectActivityHint: 'Sélectionnez une activité ci-dessus pour distribuer les points par rang.',
  assigned: 'Attribué',
  pts: 'pts',
  bonus: 'Bonus (points admin)',
  teamsQr: 'QR codes des équipes',
  globalRanking: 'Classement global',
  votesOnly: 'Votes uniquement',
  dangerZone: 'Zone de danger',
  deleteEvent: 'Supprimer cet événement',
  deleteEventDesc:
    'Supprime cet événement et toutes ses données (équipes, activités, participants, votes).',

  // Register
  readyToPlay: 'Prêt·e à jouer ?',
  yourPseudo: 'Votre pseudo',
  joinTeam: 'Rejoindre l’équipe',
  registrationError: 'Erreur lors de l’inscription.',

  // Vote
  hello: (name: string) => `Bonjour, ${name} !`,
  eventView: 'Vue de l’événement',
  voteForTeams: 'Votez pour les équipes',
  votesRemaining: (n: number) => `${n} vote${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
  yourTeam: '(Votre équipe)',
  liveRankings: 'Classements en direct',
  voteRanking: 'Classement des votes',
  voteCast: 'Vote enregistré !',
  voteFailed: 'Le vote a échoué.',
  registerFirst: 'Inscrivez-vous d’abord !',
  eventClosedNotice: 'Les votes sont fermés pour cet événement.',

  // Ranking
  backToEvent: 'Retour à l’événement',
  globalScore: 'Score global',

  // Duplicate / report / projection
  duplicate: 'Dupliquer',
  duplicated: 'Événement dupliqué.',
  duplicateConfirm: (name: string) =>
    `Dupliquer « ${name} » ? Les équipes et activités seront copiées (sans les scores ni les votes).`,
  report: 'Rapport / Export',
  exportCsv: 'Exporter en CSV',
  print: 'Imprimer',
  downloadPdf: 'Télécharger PDF',
  clientReport: 'Rapport de l’événement',
  generatedOn: 'Généré le',
  rank: 'Rang',
  team: 'Équipe',
  activitiesCol: 'Activités',
  votesCol: 'Votes',
  bonusCol: 'Bonus',
  totalCol: 'Total',
  podium: 'Podium',
  participants: 'Participants',
  projection: 'Mode projection',
  fullscreen: 'Plein écran',
  noData: 'Aucune donnée pour le moment.',
  offline: 'Connexion perdue — reconnexion en cours…',

  // Tablet access + sessions
  tabletAccess: 'Accès tablettes',
  tabletAccessLink: 'QR accès tablettes',
  tabletAccessHint:
    'Sur chaque tablette (même Wi-Fi), scannez ce QR pour ouvrir l’application.',
  installSteps: 'Installer sur une tablette (3 étapes)',
  step1: 'Sur la tablette, scannez le QR ci-dessus (appareil photo) — même Wi-Fi que le PC.',
  step2: 'Appuyez sur « Installer l’application » (ou menu ⋮ → « Ajouter à l’écran d’accueil »).',
  step3: 'Ouvrez l’icône BanaScore, allez sur la notation et entrez le code animateur.',
  installApp: 'Installer l’application',
  appInstalled: 'Application installée !',
  tabletScoringQr: 'QR de notation par tablette',
  scanToScore: 'Scannez pour noter cette activité',
  localhostWarning:
    'Vous êtes sur localhost : les autres appareils ne pourront pas se connecter. Ouvrez cette page via l’adresse réseau du PC (ex. http://192.168.x.x:3001).',
  generateSessions: 'Générer des sessions',
  sessionsCount: 'Nombre de sessions',
  sessionsPrefix: 'Préfixe (ex. Stallergix)',
  generate: 'Générer',
  sessionsCreated: (n: number) => `${n} session(s) créée(s).`,
  eventLocked: 'Notation verrouillée : l’événement n’est pas ouvert.',

  // Advanced scoring / branding / dashboard
  votingEnabled: 'Vote des participants (inscription + votes)',
  maxVotes: 'Nombre de votes par participant',
  noTeamsHint: 'Ajoutez d’abord des équipes pour pouvoir noter les activités.',
  rankingMode: 'Mode de classement général',
  rankingRaw: 'Brut (somme des points)',
  rankingNormalized: 'Normalisé par atelier (recommandé)',
  weightsHint:
    'Chaque atelier est classé puis converti sur une échelle commune (le nombre d’activités n’influe plus). Poids ×N pour qu’un atelier compte davantage.',
  noActivitiesYet: 'Ajoutez des activités pour définir les poids.',
  generalNormalizedNote:
    'Total = classement général normalisé par atelier (chaque atelier à poids égal sauf pondération).',
  coefficient: 'Coefficient (pondération du score global)',
  brandColor: 'Couleur de marque',
  logoUrl: 'URL du logo (optionnel)',
  reset: 'Réinitialiser',
  bonusLabel: 'Libellé du bonus (ex. fair-play)',
  liveDashboard: 'Tableau de bord live',
  teamsCount: 'Équipes',
  activitiesScored: 'Activités notées',

  // Ateliers (workshops)
  workshop: 'Atelier',
  workshopOptional: 'Atelier (optionnel, ex. Sensoriel)',
  workshopRankings: 'Classement par atelier',
  workshopRankingsShort: 'Par atelier',
  top3: 'Top 3',
  noActivities: 'Aucune activité notée.',

  // Scoring (animateur / tablette)
  scoreTablet: 'Noter (tablette)',
  scoringFor: 'Notation',
  chooseActivity: 'Choisissez une activité à noter',
  scorerCode: 'Code animateur (optionnel)',
  scorerCodeHint: 'Défini un code pour autoriser la notation sur tablette sans le mot de passe admin.',
  enterScorerCode: 'Entrez le code animateur',
  scorerAccess: 'Accès notation',
  scorerLoginFailed: 'Code animateur incorrect.',
  scoreSaved: 'Note enregistrée.',
  backToActivities: 'Choisir une autre activité',

  // Join + posters
  posters: 'Affiche QR (impression)',
  joinEvent: 'Rejoindre l’événement',
  chooseTeam: 'Choisissez votre équipe',
  scanToJoin: 'Scannez pour rejoindre',
  eventQr: 'QR de l’événement',
  teamQr: 'QR par équipe',

  // Generic
  back: 'Retour',
  confirm: 'Confirmer',
  deleteTeamConfirm: (name: string) =>
    `Supprimer l’équipe « ${name} » ? Ses participants, scores et votes associés seront supprimés.`,
  deleteEventConfirm: (name: string) =>
    `Supprimer l’événement « ${name} » et toutes ses données ? Action irréversible.`,
  deleteActivityConfirm: (name: string) =>
    `Supprimer l’activité « ${name} » et ses scores ?`,
  couldNotDelete: 'Suppression impossible.',
  saved: 'Enregistré.',
};
