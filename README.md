# Souq Al-Kul E-Commerce Platform

A multi-role retail and operational software platform supporting super admins, vendors, staff, moderators, and customers with Arabic and English interfaces.

## Development

```bash
npm install
npm run dev
```

## Build and verification

The production storefront is the classic-script app under `public/`; it is copied verbatim to `dist/` so all referenced `/js/*` and `/styles/*` files are deployed. `npm test` checks that local assets referenced by the HTML exist, and `npm run lint` checks TypeScript.

```bash
npm test
npm run lint
npm run build
```

Vercel should use the repository root, `npm run build` as the build command, and `dist` as the output directory. The API function is under `api/`.

## Production data warning

The current `FileDatabaseAdapter` is a JSON-file prototype. Vercel's `/tmp` is ephemeral and not shared across serverless instances. Do not use this adapter for real customer, order, or authentication data in production; configure a durable shared database adapter before launch. No production database credentials or provider were supplied, so this repository cannot safely migrate that data store automatically.
