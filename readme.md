# KayMaze

A browser maze adventure with eight trainers, four possible starters, seven replayable biomes, and three difficulty modes. Choose Pikachu, Bulbasaur, Charmander, or Squirtle, clear obstacles with Pokémon moves, and reach the waiting Pokémon for a guaranteed catch.

[Play KayMaze](https://dk2code.github.io/KayMaze/) · [GitHub repository](https://github.com/DK2Code/KayMaze)

## How to play

- Choose your trainer, starting Pokémon, and trail.
- Click or tap a reachable path to walk. Your partner follows behind you.
- Click or tap an obstacle to approach it and attack automatically. Choosing another destination or opening a menu cancels the action.
- Optional keyboard controls: WASD or arrow keys to move, Space to attack, H for a route hint, and P or Escape to pause.
- Use the game ribbon to change trails, trainer, partner, or difficulty. Changing difficulty starts a fresh maze on the same trail.
- Reach the waiting Pokémon to catch it and unlock the next biome. Collect three optional trail stars for an extra medal.
- The field guide includes sound, reduced-motion preferences, and a reset option for choosing a new starter.

Every partner can clear every obstacle. Matching attack elements are more effective. Difficulty changes maze size and obstacle strength; there is no time limit or health loss. The game supports mouse, touch, and keyboard input.

Each biome offers three different Pokémon before repeat encounters. Normal play includes your chosen starter and twenty-one trail companions. Progress and preferences are saved in your browser; ongoing mazes restart after a page reload. Saves belong to the browser and site address where you play.

## Testing mode

In the field guide, choose **Admin unlock** and enter **1234** to unlock all seven trails and all 25 Pokémon. This is a public, client-side gameplay testing feature, not an account password or security mechanism. It preserves earned records and capture animations. **Reset all progress** clears the unlock and this game's saved progress.

## Development

Node.js 18 or newer is required for the development server. No package installation or build step is needed.

```sh
npm run dev
```

Open the address printed in the terminal. To run syntax checks, gameplay simulations, input tests, progression tests, and asset verification:

```sh
npm run check
```

The playable static site is bundled in `dist/`:

- `game.mjs`: deterministic maze simulation and progression.
- `world-art.mjs` and `art.mjs`: terrain, trainers, partners, attacks, and captures.
- `controls.mjs`: shared mouse/touch navigation and optional keyboard input.
- `app.mjs`: responsive menus and game interface.

The site uses bundled assets, system fonts, and synthesized audio. Its Content Security Policy blocks outbound connections. The responsive webpage background is a single SVG illustration, with no repeating image tiles.

Optional asset tools are in `scripts/`. The art importer takes an explicit source directory: `node scripts/import-art.mjs <source-directory>`. Source paths are not written into the published asset manifest. The existing bundled assets are sufficient to play and test the game.

## Hosting

GitHub Pages publishes `main` from the repository root. The root `index.html` opens `dist/`, and `.nojekyll` keeps bundled files intact. Updates pushed to `main` are published automatically.

## Attribution

An unofficial noncommercial fan game. Pokémon characters and names belong to Nintendo, Game Freak, and The Pokémon Company.

- Pokémon portraits and canonical move data: PokéAPI.
- Directional sprites: PMDCollab SpriteCollab, including CHUNSOFT and community contributors. Community contributions use CC BY-NC 4.0; per-species credits are included in `dist/assets/directional`.
- Overworld trainer sprites and terrain: pret/pokeemerald and pret/pokefirered. Source commits, URLs, hashes, and attribution are included in `dist/assets/world`.
- Additional trainer portraits and credits are included in `dist/assets/trainers`.

Bundled animation and effect modules have recorded SHA-256 checksums. Maze balance, interface, terrain composition, trainer animation timing, and sound synthesis are specific to KayMaze.
