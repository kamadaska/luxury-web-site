# NovaAI landing page

React + TypeScript + Vite + Tailwind CSS v4 + lucide-react recreation of the NovaAI landing page.

## Setup

```bash
npm install
npm run dev
```

## Notes on assets

- The hero video and portrait are loaded directly from the CloudFront / higgs.ai URLs given in
  the spec (`src/lib/constants.ts`) — no local copy is required for the site to work.
- Optional local mirrors (`public/hero.mp4`, `public/hero-poster.jpg`) are supported: if you drop
  files at those paths, the poster will show instantly and `hero.mp4` can be swapped in for
  offline/dev use. They are not included in this project because this environment can't reach
  the CloudFront host to download them for you.
