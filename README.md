# Suites Mine CRM

Variante hotellerie/B2C du CRM o7 PulseCRM, adaptee pour Suites Mine et les clients hospitality.

Cette version garde la base applicative reelle:

- API NestJS + Prisma dans `api/`
- Frontend Next.js dans `frontend/`
- configuration Railway via le `Dockerfile` racine et `railway.json`

## Logique metier

Le mode B2C utilise un workflow hotelier `Guest Lifecycle`:

- Newsletter capture
- Segmented guest
- Campaign planned
- Stay follow-up
- Return booked
- No response

L'objectif est de gerer les hotes, reservations, campagnes, newsletter, post-estancia et comptes corporate sans transformer l'outil en pipeline de signature B2B classique.

## Railway

Railway construit depuis le `Dockerfile` racine et lance l'API:

```bash
node dist/main.js
```

Variables principales:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## Developpement local

API:

```bash
cd api
npm install
npm run start:dev
```

Donnees de demo hotel B2C:

```bash
cd api
npm run seed:demo
```

Le seed cree uniquement le tenant `Suites Mine Hotel Demo` avec des clients, offres, opportunites et taches hotellerie/B2C. Il peut etre relance pour remettre la demo a zero sans toucher aux autres tenants.

Identifiants demo locaux:

- email: `demo@suitesmine.local`
- mot de passe: `DemoHotel2026!`

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Agendas des sites depuis le CRM

Dans `/admin/mail`, **Ajouter un mois** crée une campagne persistante pour le mois et l’année choisis. Le panneau **Agenda des sites** permet de préparer les événements séparément pour Suites Mine et Business Suites Kepler, en ES/EN/中文. **Enregistrer la préparation** conserve les brouillons privés ; **Valider et programmer ce mois** publie un instantané validé et crée ou met à jour le lien public de présentation de la newsletter. Les liens déjà partagés conservent leur adresse.

Le serveur sélectionne à chaque requête le mois courant dans `America/Mexico_City`. Un mois validé devient donc public à 00 h le premier jour, sans tâche planifiée, onglet admin ouvert ou nouveau déploiement des sites. Un mois non validé reste vide ; le programme précédent ne réapparaît pas. Les sites relisent leur flux au chargement, toutes les minutes et au retour dans un onglet. Les nouvelles modifications restent privées jusqu’à une nouvelle validation.

Les tables `WebsiteAgenda` et `WebsiteAgendaMonth` isolent les sites par tenant et séparent préparation et publication. Les associations domaine/tenant sont configurées côté serveur. Les routes administrateur nécessitent le rôle OWNER/ADMIN et une version de préparation à jour. Le flux public `/api/public/website-agendas/:id/current` expose uniquement le mois courant validé ; les visuels officiels autorisés sont servis en WebP. Les liens `/agenda/...` destinés à la présentation restent consultables en avance.

Vérifications : `cd api && npm test -- --runInBand && npm run build`, puis `cd frontend && node --test tests/*.test.cjs && npm run build`.

Le panneau **CRM Mailing ↔ Buffer** inclut le mois courant à l’heure de Mexico et toutes les campagnes futures, dans l’ordre chronologique. **Synchroniser les mois affichés** prépare les brouillons Facebook/Instagram ; les campagnes sont envoyées par groupes de douze pour respecter la limite de l’API. Les publications programmées ou déjà publiées sont conservées. Une nouvelle synchronisation réutilise les posts déjà reliés.

Les créations et mises à jour Instagram préparent automatiquement un JPEG sRGB de 320 à 1080 pixels de large. Les proportions compatibles sont conservées ; une marge est ajoutée aux affiches hors format pour éviter de couper du texte. Les visuels sont préparés avant l’envoi à Buffer, puis servis par des URLs signées stables sous `/api/public/instagram-images/v1/`. La variable Railway `INSTAGRAM_IMAGE_SIGNING_KEY` signe ces URLs et doit être conservée pour les publications futures déjà préparées. Facebook conserve son visuel d’origine. Cette préparation s’applique aussi au bouton de programmation du studio Buffer dans le CRM.
