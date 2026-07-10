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

Frontend:

```bash
cd frontend
npm install
npm run dev
```
