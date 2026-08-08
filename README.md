# Doremon Jump Game

A mobile-first jump-and-climb internal contest. Players review the basket and reward rules, then enter their name, Indian mobile number and branch before steering by phone tilt, touch/drag, or keyboard. Eligible investment baskets appear as goodies on platforms and add their published Runs values when collected.

The difficulty curve stays welcoming: fixed boards through 10,000 score points, moving boards from 10,000, breakable boards after 20,000, and flying villains after 30,000. Board density reaches full difficulty at 50,000. Tap a villain to launch a homing fireball. A random destination—including Miami—unlocks every 10,000 score points.

## Run locally

```bash
npm install
npm run dev
```

## Connect the lead form

The game always stores the latest player on their own device so it works in demo mode. To send leads elsewhere, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_LEAD_FORM_ENDPOINT`.

- **Netlify Forms:** use `/`. The form is already named `doremon-jump-leads`.
- **Formspree / webhook / CRM:** paste the HTTPS endpoint. When a run ends, the game sends one result containing `name`, `mobile`, `branch`, `score`, `runs`, `rewardPoints`, `goodiesCollected`, `villainsDefeated`, `worldReached`, `basketBreakdown`, and `completedAt`.
- **Google Sheets:** deploy a Google Apps Script web app that accepts POST requests, then use that URL.

For production, validate and rate-limit submissions at the destination endpoint. Add the approved privacy notice and retention policy before public launch.

## Deploy to Netlify

Import the repository in Netlify. `netlify.toml` already supplies the build command, publish directory, Node version, gyroscope permissions, and `VITE_LEAD_FORM_ENDPOINT=/`. Entries will appear in **Forms → doremon-jump-leads** without another environment variable.

1. Push this project to a Git repository.
2. In Netlify, choose **Add new project → Import an existing project** and select the repository.
3. Keep the detected settings: build command `npm run build:static`, publish directory `deploy`.
4. Publish the site once, then open **Forms** in Netlify and select **Enable form detection**.
5. Trigger a new deploy so Netlify scans the included static form blueprint.
6. Open the HTTPS URL on a phone and allow motion access when prompted.
7. Submit one test player, then confirm the entry under **Forms → doremon-jump-leads**.

Gyroscope access requires the deployed HTTPS URL. Netlify provides HTTPS automatically.

## Deploy to Vercel

Import the repository in Vercel. `vercel.json` supplies the static build settings. Set `VITE_LEAD_FORM_ENDPOINT` to a Formspree, Google Apps Script, or CRM webhook URL in **Project Settings → Environment Variables**.

## Verify a production bundle

```bash
npm run build:static
```

The deployable files are written to `deploy/`.
