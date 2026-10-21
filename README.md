# High Tide Puzzles

Free daily puzzles in the browser. No accounts, no ads, no tracking. Each puzzle gets a new board
every day at the player's local midnight, and progress is saved in the player's browser.

Built with [Astro](https://astro.build) and Tailwind CSS. It's a fully static site, hosted on
Cloudflare Workers.

## Puzzles

| Puzzle | What it is | Status |
| --- | --- | --- |
| **Sea Glass** | Drag square tiles onto a 7×4 board so every touching edge matches in color. Easy and Hard. | Daily, generated |
| **Word Chain** | Link pairs of words down a pyramid. | Coming soon (dev only) |
| **Bridges** | Connect numbered islands with bridges. | Coming soon (dev only) |
| **Buoy** | Place buoys on a 9×9 board split into regions, matching every row, column and region count. Buoys may touch. Easy and Hard (Hard hides some row and column numbers). | Daily, generated |

## How the daily puzzles work

Puzzles are never stored or fetched. Each one is **generated in the browser** from a random number
generator seeded with the puzzle's slug, the difficulty, and the player's local date
(`src/puzzles/daily.ts`). Everyone whose calendar shows the same day gets the same puzzle, and it
changes at their own midnight.

Generators keep making boards until one has **exactly one solution**. Each generator and
solver lives in its puzzle folder's `generate.ts`, kept free of page code so the same logic can be
checked before deploying.

Progress (the board, the time and whether it's finished) is saved in `localStorage` per puzzle,
difficulty and date. Saves from more than a couple of days ago are cleared automatically.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Build the site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run check:puzzles` | Generate every daily Sea Glass and Buoy puzzle from a month ago to 3 years ahead and check each has exactly one solution |
| `npm run deploy` | Check the puzzles, build, and deploy to Cloudflare (stops if any puzzle fails) |

After a fresh clone, run `npx astro sync` once so the editor picks up Astro's types.

## Project layout

```
src/
  pages/
    index.astro            Homepage: today's puzzles, FAQ, contact
    [id].astro             One page per puzzle, built from the puzzle list
    legal/                 Privacy policy and terms of service
    404.astro
    robots.txt.ts          Built from the site's domain
  puzzles/
    index.ts               The puzzle list (order shown on the homepage)
    types.ts               PuzzleConfig: what each puzzle can switch on
    daily.ts               Seeded randomness, local dates, saved progress
    stats.ts               Streaks and best times, kept in the browser
    <Puzzle>/              Each puzzle: component, config, icon, help examples
  layouts/
    Layout.astro           Every page: head tags, header, skip link, theme
    PuzzleLayout.astro     Puzzle pages: title row, difficulty tabs, timer, toolbar, help
    LegalLayout.astro      Privacy / terms frame
  components/
    common/                Header, footer, logo, SEO tags
    home/                  Homepage sections
    puzzle/                Shared puzzle UI (timer, toolbar, help popup, celebration)
  data/info.ts             Site name, contact email, Buy Me a Coffee link
scripts/
  check-puzzles.ts         The pre-deploy puzzle check
  social-image.html        Source for the link-preview image
public/                    Favicons and the link-preview image
```

## Adding a puzzle

1. Create `src/puzzles/<Name>/` with the puzzle component, an icon `.svg` and a `config.ts`
   (see `types.ts` for every option: difficulties, timer, toolbar buttons, help examples).
2. Add the config to `PUZZLE_LIST` in `src/puzzles/index.ts`. Its page and homepage card appear
   automatically. While it's unfinished, set `comingSoon: true`: the card shows "Coming soon" and the
   page is only built in `npm run dev`.
3. The puzzle talks to the shared page through window events: it fires `puzzle:solved` when
   solved, and listens for toolbar actions (`puzzle:reset`, `puzzle:reveal`, ...),
   `puzzle:difficulty-change` and `puzzle:new-day`.
4. For a generated daily puzzle, seed it with `dailyRandom(slug, difficulty, dateKey)` and add its
   check to `scripts/check-puzzles.ts`.

## SEO and sharing

- The live domain is `site` in `astro.config.mjs`. Canonical links, the sitemap, `robots.txt` and
  link previews all come from it.
- Page titles and descriptions: the homepage's is built from the puzzle names in
  `src/pages/index.astro`; each puzzle's comes from its `tagline` (in `PuzzleLayout.astro`); the
  legal pages and 404 set their own.
- The link-preview image `public/og-main.png` is made from `scripts/social-image.html`. The command
  to remake it is at the top of that file.

## Before launch

- [ ] Set the real domain in `astro.config.mjs`
- [ ] Set the real contact email and Buy Me a Coffee link in `src/data/info.ts`
- [ ] After the first deploy, submit `/sitemap-index.xml` in Google Search Console
