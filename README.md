# Perishable Order Optimizer

A static single-page tool that estimates optimal warehouse order quantity (Q) and store allocations (aᵢ) for perishable SKUs using a Monte Carlo simulation plus a lightweight allocation heuristic. All computation runs in the browser—no backend required.

## Features
- Grid search over Q with Monte Carlo simulations to balance profit, fill, and waste.
- Priority-aware store allocations using a deterministic heuristic.
- KPI cards for profit, fill rate, waste ratio, and confidence gap between the top Q candidates.
- JSON export/import to move scenarios between browsers.
- Dark, card-based UI that works offline once built.

## Getting started
1. Install dependencies
   ```bash
   npm install
   ```
2. Run the dev server
   ```bash
   npm run dev
   ```
   Vite will print the local URL (default `http://localhost:5173`).
3. Build for production
   ```bash
   npm run build
   ```
   Output is written to `dist/` (gitignored).
4. Preview the production build
   ```bash
   npm run preview
   ```

## Linting and formatting
- Lint: `npm run lint`
- Format: `npm run format`

## Using the app
1. Enter SKU economics: unit price, unit cost, salvage value, and a per-unit stockout penalty.
2. Configure simulation settings: iterations, random seed (for reproducibility), Q grid step, and the service-priority tilt used in allocation.
3. Add or edit stores with mean demand, standard deviation, and a priority weight. Remove stores that do not apply.
4. Click **Run optimization** to search Q and allocate stock. The recommended Q and allocations appear in the Results panel.

### Import/export JSON
- **Export JSON** downloads a portable file containing inputs and stores.
- **Import JSON** accepts a previously exported file to restore a scenario.

## Model assumptions and limitations
- Demand per store is sampled from a truncated normal distribution (no negative draws).
- Allocation is heuristic: desired stock is proportional to forecasted demand scaled by priority. No MILP/linear solver is used.
- Q search is a bounded grid around total expected demand; extreme edge cases may require adjusting the Q step or store means.
- Monte Carlo iterations are bounded to avoid heavy CPU usage in-browser.
- All logic runs client-side; offline use is supported after build.

## Project structure
- `src/` — app logic and styles
- `public/` — static assets (favicon, etc.)
- `dist/` — production build output (gitignored)
- `docs/` — short documentation for maintainers
- `.github/workflows/` — CI workflow running lint and build on push/PR

## License
MIT
