# Suites Mine B2C — instructions Railway

Statut : préparation uniquement. Aucun projet Railway créé, aucune base de production modifiée. O7 reste le master B2B ; Suites Mine devient le premier déploiement B2C indépendant. Le code CRM partagé ne transforme pas encore les écrans en logiciel hôtelier : Cloudbeds et Olivia restent à connecter.

## Architecture à créer

Créer un **nouveau projet Railway `crm-b2c-suitesmine`**, distinct de `modest-heart` (O7) et de `bubbly-hope` (bots). Dans ce projet, créer `staging` puis `production`, chacun avec son service `api-suitesmine` et son service `Postgres`. Créer des bases vides ; ne pas dupliquer les données ni les variables d'O7. Chaque futur client B2C aura son propre projet, sa base, son application d'authentification et ses secrets.

Le frontend reste sur Vercel dans le projet Suites Mine. Les bots existants restent indépendants. Une interface Cloudbeds/Olivia est préparée dans `api/src/integrations/contracts.ts` ; elle ne déclenche aucune synchronisation.

## Source et compilation

- Dépôt : dépôt Git actuel de Suites Mine, branche de travail `convergence/crm-integrations` pour staging.
- Root Directory : racine du dépôt `/`, pas `/api` (le Dockerfile racine copie `api/`).
- Configuration : `/railway.json` ; builder Dockerfile ; fichier `./Dockerfile`.
- Démarrage : `node dist/main.js`. Port cible 8080 ou celui injecté par Railway.
- Healthcheck : `/api/ready`, délai 120 secondes. Retourne 503 si la base ou les colonnes CRM requises manquent ; aucun détail de connexion exposé.
- **Aucune commande de migration au démarrage ni en pre-deploy.** `RUN_LEGACY_SCHEMA_UPGRADER=false`.
- Créer un domaine public pour l'API. Ne pas ouvrir PostgreSQL au frontend.

Références officielles : [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [PostgreSQL](https://docs.railway.com/databases/postgresql), [variables de référence](https://docs.railway.com/variables/reference), [healthchecks](https://docs.railway.com/deployments/healthchecks).

## Variables Railway

Utiliser `api/.env.railway.example` comme liste de champs, pas comme secrets prêts à déployer. Dans chaque environnement :

| Variable | Valeur / règle |
| --- | --- |
| `NODE_ENV` | `production`, y compris en staging pour tester les contrôles de production |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, référence au Postgres du même environnement |
| `FRONTEND_URLS` | liste exacte séparée par virgules ; production `https://crm-suitesmine.vercel.app` ; staging seulement ses URLs de preview autorisées |
| `JWT_SECRET` | secret aléatoire propre à ce client et environnement, au moins 32 octets |
| `JWT_ISSUER` | identifiant propre à l'environnement, par exemple `https://<domaine-api-suitesmine>` |
| `JWT_AUDIENCE` | `suitesmine-crm-production` ou `suitesmine-crm-staging` |
| `MARKETING_ENCRYPTION_KEY` | 32 octets aléatoires encodés en base64 ; conserver dans le gestionnaire de secrets pour pouvoir relire les credentials chiffrés |
| `CLERK_JWT_ISSUER` | issuer exact de l'application Clerk dédiée à Suites Mine |
| `CLERK_JWT_AUDIENCE` | audience réellement contenue dans le token Clerk, spécifique à Suites Mine |
| `RUN_LEGACY_SCHEMA_UPGRADER` | `false` |

Générer chaque secret séparément avec `openssl rand -base64 32`, puis le saisir dans Railway, jamais dans Git. Ne pas copier les clés d'O7. Le frontend utilise actuellement le token de session Clerk : configurer son claim `aud` pour correspondre à `CLERK_JWT_AUDIENCE`, puis vérifier un vrai login. L'issuer et l'audience sont obligatoires avec les nouveaux contrôles d'authentification. Si Clerk refuse ce contrat de session, adapter explicitement le template et l'appel `getToken` avant activation ; ne pas désactiver la vérification.

Optionnel, après création du workspace réel : `CLIENT_PUBLIC_LEADS_OWNER_EMAIL` et `CLIENT_PUBLIC_LEADS_TENANT_ID`, appartenant au même client. Sans ces valeurs, l'entrée publique de leads reste désactivée. Ne pas renseigner de propriétaire O7.

Ne pas ajouter de clés Cloudbeds, GA4 ou Olivia dans des variables inventées : les adaptateurs d'exécution ne sont pas encore implémentés. Mailchimp, SMTP et Buffer se configurent ensuite dans le workspace client via le module communication ; Buffer reste en brouillon. Ne pas envoyer de campagne pendant la recette.

## Base et migrations : étape à valider

L'historique contient une anomalie connue dans `0006_post_sales_stages` : le deuxième INSERT référence une CTE `won_stage` hors de sa portée. **Ne pas lancer `prisma migrate deploy` sur une base vide en supposant que tout l'historique passe.** Ne pas modifier silencieusement une migration historique déjà appliquée ailleurs.

Pour une base neuve B2C, le SQL `api/prisma/bootstrap/suitesmine-b2c-review.sql` a été généré à partir du schéma Suites Mine et exécuté avec succès sur une base PostgreSQL locale vide. Les comptes, tenants, contacts et deals y restent à zéro. Ce SQL est un artefact de revue, pas une migration automatiquement exécutée. Faire relire le SQL, la procédure de suivi Prisma et le résultat des tests avant toute exécution en production. Pour une éventuelle base Suites Mine existante, identifier sa vraie source et son historique avant d'appliquer uniquement les migrations manquantes 0036/0037. Ne jamais substituer une base vide à des données existantes sans inventaire/export validé.

Les migrations proposées et tests se trouvent dans `api/prisma/migrations/0036_deal_closing`, `0037_pulse_phase1` et `api/test/run-phase1-integration.sh`. Le script de tests détruit uniquement la base locale jetable nommée `pulse_phase1_test` ; il refuse un hôte distant. Il teste 0037 sur un schéma préalable figé et ne valide pas tout l'historique.

## Connexion Vercel, après recette staging

Sur une preview du projet Vercel Suites Mine : `NEXT_PUBLIC_API_ROOT=https://<api-staging>/api`, `NEXT_PUBLIC_DEMO_MODE=false`, clés Clerk de staging. Ajouter son URL exacte dans `FRONTEND_URLS` de staging. Redéployer le frontend pour prendre en compte les variables publiques compilées. Ne pas modifier O7.

Après validation des migrations et de la recette, appliquer la même procédure avec les ressources et clés de production. Vérifier `/api/ready`, `/crm`, une fiche deal, `/tasks`, `/admin/mail` et `/admin/connections` avec un vrai compte Suites Mine. Dans les paramètres du workspace, vérifier `crmMode=B2C` et le pipeline Guest Lifecycle ; ne pas changer le mode du master O7. Tester un second workspace isolé : ses contacts, campagnes, deals et credentials ne doivent pas être accessibles au premier. Tester WON/LOST et Undo ; WON/LOST ne sont pas des colonnes permanentes.

Contrôler les brouillons Buffer sans nouvelle création de masse, aucun envoi Mailchimp/SMTP. Les statuts Cloudbeds/GA4/Olivia doivent afficher leur indisponibilité réelle. Prévoir la restauration du déploiement précédent sans supprimer les nouvelles colonnes ni les données.

## Informations à relever avant bascule

IDs Railway projet/environnement/service, URL publique API, référence Postgres, URL preview autorisée, application Clerk dédiée et contrat issuer/audience, inventaire de la source des données Suites Mine, SQL de migration ou baseline validé. Tant que ces éléments ne sont pas établis, conserver le site actuel et ne pas déclarer l'intégration opérationnelle.

## Preview Clerk — 10 septembre 2026

L'application Clerk dédiée de développement utilise l'issuer `https://rich-adder-4331.clerk.accounts.dev`. La paire de clés a été vérifiée contre le JWKS ; les secrets sont enregistrés dans les variables Vercel Preview, jamais dans ce document. Les claims de session demandés sont `aud=suitesmine-crm-staging` et `email={{user.primary_email_address}}` ; une session réelle doit encore les valider.

Pour la preview CLI, lancer `vercel deploy` depuis **frontend/**, lié au projet Vercel Suites Mine. `frontend/vercel.json` déclare explicitement Next.js. Le déploiement historique depuis la racine avec les routes legacy renvoyait 404 sur les routes dynamiques de connexion ; ne pas promouvoir cette configuration sans recette. Les variables Preview communes sont nécessaires aux déploiements CLI sans métadonnées de branche.

Railway : le build Docker du commit 95e40cea réussit, mais le healthcheck du déploiement observé a échoué. L'initialisation de la base et la validation de sa destination restent préalables à la recette complète. Les modifications issuer/CORS ont été enregistrées avec `--skip-deploys` ; elles nécessitent un prochain déploiement API pour prendre effet.
