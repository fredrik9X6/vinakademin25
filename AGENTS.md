# Agents

## Cursor Cloud specific instructions

### Overview
This is a full-stack wine academy web platform built with Next.js 15 + PayloadCMS v3 + PostgreSQL. It's a monolithic app: frontend, admin panel (`/admin`), and API all run from a single `pnpm dev` process on port 3000.

### Services

| Service | How to Run | Notes |
|---|---|---|
| PostgreSQL | Start via Docker with `postgres:16` image, user/pass `postgres/postgres`, port 5432. DB name should match `DATABASE_URI` in `.env`. | Use **postgres:16** (not `latest`); v18+ has breaking data-directory changes. |
| Next.js + PayloadCMS | `pnpm dev` | Runs on http://localhost:3000. Admin at `/admin`. |

### Environment
- Requires `.env` with at minimum `DATABASE_URI` and `PAYLOAD_SECRET`. See `.env.example` for optional keys.
- `DATABASE_URI` format: `postgresql://postgres:postgres@localhost:5432/<dbname>`
- `PAYLOAD_SECRET` can be any string for development.

### Gotchas

- **Docker daemon**: In the Cloud VM, Docker must be started manually (`sudo dockerd &`). `fuse-overlayfs` storage driver and `iptables-legacy` are required for nested containers.
- **First admin user**: The PayloadCMS "Create First User" UI form fails with "You are not allowed to perform this action" because the Resend email adapter (for verification emails) has no valid API key. **Workaround**: Create the admin user by direct SQL insert with a PBKDF2-hashed password (see PayloadCMS source at `node_modules/payload/dist/auth/strategies/local/generatePasswordSaltHash.js` for the hashing algorithm: `crypto.pbkdf2(password, salt, 25000, 512, 'sha256')`).
- **docker-compose.yml** uses `postgres:latest` which maps to v18+ and fails. Use `postgres:16` directly instead.

### Standard commands
- **Lint**: `pnpm lint`
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Type generation**: `pnpm generate:types`
- Package manager: **pnpm** (lockfile: `pnpm-lock.yaml`)
