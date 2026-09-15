# Drawnix

A whiteboard for sketching, saving boards, and coming back to them later.

## Stack

Next.js, Auth.js (Google + GitHub), Prisma, Postgres, tldraw.

## Run locally

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Copy `.env.example` to `.env` and fill in the database URL plus OAuth credentials.

Open [http://localhost:3000](http://localhost:3000).
