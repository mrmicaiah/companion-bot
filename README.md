# Companion Bot

AI companion texting service. Real personalities, infinite memory, actual relationships over time.

## Tech Stack

- **Compute:** Cloudflare Workers
- **Database:** Cloudflare D1
- **Memory:** Cloudflare R2
- **Messaging:** SendBlue (iMessage)
- **Payments:** Stripe
- **AI:** Claude API

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Cloudflare resources

```bash
# Create D1 database
npx wrangler d1 create companion-db

# Create R2 buckets
npx wrangler r2 bucket create companion-memory
npx wrangler r2 bucket create companion-memory-backup
```

### 3. Update wrangler.toml

After creating the D1 database, update the `database_id` in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "companion-db"
database_id = "YOUR_DB_ID_HERE"  # <-- Update this
```

### 4. Run migrations

```bash
# Initial schema
npm run db:migrate

# Seed Bethany persona
npx wrangler d1 execute companion-db --file=./migrations/002_seed_bethany.sql
```

### 5. Set secrets

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put SENDBLUE_API_KEY
npx wrangler secret put SENDBLUE_API_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_API_KEY
```

### 6. Deploy

```bash
npm run deploy
```

## Local Development

```bash
npm run dev
```

## Project Structure

```
companion-bot/
├── src/
│   ├── index.ts              # Main router
│   ├── types.ts              # TypeScript types
│   ├── handlers/
│   │   ├── sms.ts            # Incoming message handler
│   │   ├── stripe.ts         # Stripe webhook handler
│   │   └── scheduled.ts      # Cron job handler
│   ├── memory/
│   │   └── index.ts          # R2 memory operations
│   ├── services/
│   │   ├── claude.ts         # Claude API
│   │   └── sendblue.ts       # SendBlue API
│   └── db/
│       ├── personas.ts       # Persona queries
│       ├── users.ts          # User queries
│       ├── conversations.ts  # Conversation queries
│       ├── events.ts         # Conversion events
│       └── blocked.ts        # Blocked numbers
├── migrations/
│   ├── 001_initial.sql       # Database schema
│   └── 002_seed_bethany.sql  # Bethany persona data
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/sms` | POST | SendBlue incoming message webhook |
| `/webhook/stripe` | POST | Stripe webhook |
| `/health` | GET | Health check |
| `/debug/personas` | GET | List personas (requires API key) |
| `/debug/users` | GET | List users (requires API key) |

## Memory Structure (R2)

```
companion-memory/
└── {persona_slug}/{user_id}/
    ├── core.json         # Who they are
    ├── relationship.json # Your relationship with them
    ├── threads.json      # Active follow-up threads
    ├── people/           # People they've mentioned
    │   └── {person}.json
    └── expansion/        # Conversation summaries by month
        └── {YYYY-MM}.json
```

## Build Phases

- [x] Phase 1: Foundation (worker, D1, R2, basic routing)
- [ ] Phase 2: Messaging (SendBlue integration)
- [ ] Phase 3: Security (verification codes)
- [ ] Phase 4: Memory System (full retrieval)
- [ ] Phase 5: Onboarding
- [ ] Phase 6: Intelligence Layer
- [ ] Phase 7: Background Processing
- [ ] Phase 8: Tier System
- [ ] Phase 9: Signup & Payment
- [ ] Phase 10: User Lifecycle
- [ ] Phase 11: Operations
- [ ] Phase 12: Admin Tools
- [ ] Phase 13: Analytics
- [ ] Phase 14: Landing Page
- [ ] Phase 15: Legal
- [ ] Phase 16: Brand & Photos
- [ ] Phase 17: Additional Personas
- [ ] Phase 18: Launch
