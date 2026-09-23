This is a Next.js dashboard project.

## Planning

`/planning` reads the yearly planning workbook (`Planning 2026.xlsx`: one sheet per month with
`Responsible person | Actions | Status | Comments`, plus `General milestones`) straight from Google
Drive and emails a management digest every morning at 07:00 Tehran. Nothing is entered in the
dashboard; the whole setup is environment variables.

1. Create a Google Cloud service account (Drive API enabled) and share the planning folder — or just the
   workbook — with its e-mail address as **Viewer**. That is the only "access" step.
2. Set on the server (Vercel → Environment Variables):

   | Variable                                                        | Purpose                                                                                                                                                           |
   | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`            | Service-account credentials (`private_key` from the JSON key; `                                                                                                   |
   | ` line breaks are fine).                                        |
   | `PLANNING_DRIVE_FOLDER_ID`                                      | Folder that holds one file per year named `Planning {YYYY}` (`.xlsx` or Google Sheet). Or set `PLANNING_FILE_ID` to pin a single file.                            |
   | `PLANNING_DIGEST_TO`                                            | Digest recipients, comma-separated.                                                                                                                               |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Any SMTP sender (Gmail: `smtp.gmail.com`, 587, an App Password).                                                                                                  |
   | `CRON_SECRET`                                                   | Random string; Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/planning-digest` (schedule in `vercel.json`, 03:30 UTC = 07:00 Tehran, every day). |
   | `PLANNING_TEAMS` (optional)                                     | `Supply=Azat,Mostafa;Logistics=Ulyana` groups the digest by team; without it the digest is grouped by person.                                                     |
   | `PLANNING_LOOKBACK_MONTHS` (optional)                           | How many earlier months' open work is carried over (default 1).                                                                                                   |
   | `PLANNING_LOCAL_FILE` (local dev only)                          | Path to a local `.xlsx`; used instead of Drive when no service account is configured.                                                                             |
   | `PLANNING_FILE_PATTERN`, `PLANNING_CLOSED_STATUSES` (optional)  | Yearly file name pattern (default `Planning {YYYY}`) and the status values that count as closed.                                                                  |

Month sheets are matched by their first three letters (`Feb`, `Sept`, `Novemb`), a missing header row
is tolerated, `Azat/Uliana/Mostafa` counts for all three people, and spelling variants of a name
(Ulyana/Uliana, Pooria/Pouria/Pooriya) are merged automatically. A task is closed when its status
starts with done / cancel / moved / postponed / not relevant; blank, "in process", "not done" and
"partially done" stay open. The General milestones sheet also feeds the **Sales plan** tab (yearly
target by brand, monthly prediction vs actual, quarterly plan, monthly priorities and the
per-salesperson "Sales Control by team" table) and adds the month's sales target and priorities to
the digest. The digest lists the month's milestones, then every open action per
person with status and latest comment, flagging work carried over from the previous month. If Drive
cannot be read the digest is skipped for that day (never stale data) and the page shows the last good
read with a warning. "Send now" on the Daily digest tab sends immediately.

## Offers Sent refreshes

The Offers Sent source sheet stores `Record ID` and `Added At` in columns J/K,
beside the existing A:E data and G:I summary. `Added At` is an ISO timestamp
with a timezone, assigned when an offer is first imported into this board.
The dashboard highlights that row in amber with a `New` label for exactly
seven days. Existing rows without an import date remain unhighlighted.
The same timestamp is used for signed-in, admin and shared dashboards;
refreshing, reopening, renaming a deal, or changing its amount does not reset it.

For each user-supplied HubSpot export:

1. Read the current source sheet, including J/K, and extract the export's rows.
2. Use `prepareOffersUpdate` in `lib/group-offers-import.mjs` with `currentDeals`,
   `existingRows`, and the actual `importedAt` timestamp. On the first migration
   only, provide `previousDeals` from the previous export to identify legacy rows.
3. Review `addedIds`, `counts` and `excludedOwners`. Group assignments come from
   existing owner mappings; do not assign unknown owners to a group by guessing.
4. Write the prepared offers to A:E and J:K together. Clear leftover old rows
   in those ranges if the list shrinks. Preserve formatting and the G:I summary
   formulas, extending their ranges if the data grows past them. Keep numeric
   close dates as date serials and apply the existing date format to new rows.
5. Read back the rows and summary, then verify new and unchanged timestamps.

Do not use HubSpot's `Last Modified Date` or `Close Date` for `Added At`.
The import timestamp represents when the record was added to the dashboard,
not the unknown historical date it entered HubSpot's Offer Sent stage.

## Authentication and public links

Set `LOGIN_USER`, `LOGIN_PASS`, and `AUTH_SECRET` in the server environment before starting the app. There are no fallback login credentials. Generate a random session secret using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`; set the generated value as `AUTH_SECRET` (at least 32 characters). Keep it out of Git and configure it separately in the hosting environment before deploying.

Signed login sessions expire after eight hours. Changing the credentials or secret invalidates existing sessions. Older unsigned cookies require signing in again.

Existing `/share/` links grant read access to the corresponding dashboard. Treat those links as access credentials. API requests from these pages carry a `share` query parameter; group responses contain that group's records plus the common LOGISTIC AA board. Technical links expose the technical queue and technical message; supply links expose supply data and the supply message. Signed-in dashboards retain full access. Public group comparisons contain only the selected group. Public and signed-in group pages use the same dashboard component for consistent styling, tables and view settings; event slideshows remain available only to signed-in viewers.

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
