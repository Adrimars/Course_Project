# Quickstart: Innovation Portal

**Phase**: 1 | **Branch**: `1-innovation-portal` | **Date**: 2026-02-24

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| PostgreSQL | 16+ | https://www.postgresql.org/download/ |
| npm | 10+ | Bundled with Node.js |
| Git | Any | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd innovation-portal
npm install
```

---

## 2. Environment Variables

Copy the template and fill in values:

```bash
cp .env.example .env.local
```

`.env.example` contents:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/innovation_portal"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-at-least-32-chars"   # generate: openssl rand -base64 32

# File uploads (absolute path recommended for production)
UPLOAD_DIR="./uploads"
```

Generate `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 3. Database Setup

```bash
# Create the database (run in psql or use pgAdmin)
createdb innovation_portal

# Push schema and run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

---

## 4. Create Upload Directory

```bash
mkdir -p uploads
```

> The `uploads/` directory is gitignored. Create it before running the server.

---

## 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**First user registered becomes Admin automatically.**

---

## 6. Seed Test Data (Optional)

```bash
npx prisma db seed
```

This creates:
- `admin@example.com` / `Admin123!` (role: ADMIN)
- `user1@example.com` / `User1234!` (role: USER)
- 5 sample ideas with mixed visibility and statuses

_(Seed file: `prisma/seed.ts`)_

---

## 7. Run Tests

```bash
# Unit + Integration tests
npm test

# With coverage report
npm run test:coverage

# E2E tests (requires running dev server)
npm run dev &
npx playwright test

# E2E with UI
npx playwright test --ui
```

---

## 8. Build for Production

```bash
npm run build
npm start
```

> Ensure `DATABASE_URL` and `NEXTAUTH_SECRET` are set in the production environment.  
> Run `npx prisma migrate deploy` before starting the production server.

---

## 9. Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm test` | Run Jest unit + integration tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |
| `npx playwright test` | Run E2E tests |
| `npx prisma studio` | Open Prisma GUI |
| `npx prisma migrate dev` | Apply schema changes in development |

---

## 10. Key URLs (Development)

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/register | User registration |
| http://localhost:3000/login | User login |
| http://localhost:3000/dashboard | Idea dashboard |
| http://localhost:3000/ideas/new | Submit new idea |
| http://localhost:3000/admin | Admin review panel |
| http://localhost:3000/admin/users | Promote users to admin |
| http://localhost:5555 | Prisma Studio (after `npx prisma studio`) |

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| `Error: connect ECONNREFUSED localhost:5432` | PostgreSQL is not running; start with `pg_ctl start` or `brew services start postgresql` |
| `PrismaClientInitializationError` | Check `DATABASE_URL` format and DB exists |
| File uploads not saving | Ensure `uploads/` directory exists and is writable |
| `NEXTAUTH_SECRET` error | Set at least 32-character random string in `.env.local` |
| Session not persisting | Ensure `NEXTAUTH_URL` matches the URL you're accessing |
| Playwright tests failing | Ensure dev server is running on port 3000 before E2E |
