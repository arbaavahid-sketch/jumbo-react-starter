This is a Next.js dashboard project.

## Authentication and public links

Set `LOGIN_USER`, `LOGIN_PASS`, and `AUTH_SECRET` in the server environment before starting the app. There are no fallback login credentials. Generate a random session secret using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`; set the generated value as `AUTH_SECRET` (at least 32 characters). Keep it out of Git and configure it separately in the hosting environment before deploying.

Signed login sessions expire after eight hours. Changing the credentials or secret invalidates existing sessions. Older unsigned cookies require signing in again.

Existing `/share/` links grant read access to the corresponding dashboard. Treat those links as access credentials. API requests from these pages carry a `share` query parameter; group responses contain only that group's records. Technical links expose the technical queue and technical message; supply links expose supply data and the supply message. Unassigned logistics records are excluded from public group responses. Signed-in dashboards retain full access. Public group comparisons now contain only the selected group.

Before release, verify login and each public dashboard with the production environment configured. Authentication protects this application's endpoints; it does not change sharing permissions on the source Google Sheets or external Drive links.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
