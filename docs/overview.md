# Perishable Order Optimizer

This document summarizes the optimization flow for the static single-page app.

## Flow
1. **Inputs**: SKU economics (price, cost, salvage value, stockout penalty) and a list of stores with mean/standard deviation demand and service priority.
2. **Optimization**: A grid search over candidate warehouse order quantities (Q) combined with a Monte Carlo simulation.
3. **Allocation heuristic**: For each candidate Q, stock is allocated to stores in priority order against their expected demand. Remaining stock is distributed proportionally across higher priority stores.
4. **Simulation**: Each iteration draws truncated normal demand per store and evaluates profit, fill rate, waste, and service shortfalls.
5. **Recommendation**: The Q and allocation that maximize average profit are surfaced with supporting KPIs.

## Offline readiness
All computation runs in the browser; the built `dist/` folder contains static HTML, CSS, and JS with no external CDNs.

## Extending the model
- Keep iteration counts bounded.
- Document new assumptions and input fields in the README.
- Maintain deterministic seeds when debugging new behavior.
- Favor client-side storage (JSON import/export) over persistent services.
