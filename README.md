# karyabi-pt-backend

## Contributions

If you want to contribute to this open source project to support Iranians living in Portugal, pick any task from the Backlog column on the backend Kanban board: https://github.com/users/pouyakondori/projects/4. Create a new branch using the conventional commits naming style `feature/<github-issue-id>_short-description`, then open a merge request to suggest your changes.

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Generate Prisma client with `npm run prisma:generate`
4. Run migrations with `npm run prisma:migrate`
5. Start dev server with `npm run dev`

## Key Notes

- All `/api/*` routes are blocked until GDPR consent is supplied via `x-gdpr-consent: true` or the consent cookie.
- Authenticated routes expect a Bearer JWT whose payload includes `sub` and `role`.
- Public job filters accept `full-time` and `part-time`.
- Vercel entrypoint: `api/index.ts`

## Seed demo data

Run:

```bash
npm run seed
```

This creates:
- one admin user
- one employer user
- one job seeker with profile
- three approved jobs
- one pending job
- one sample application

## Tests

Run:

```bash
npm test
```
