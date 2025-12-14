# Contributing

Thank you for improving **perishable-order-optimizer**. To keep changes safe and reviewable, please follow these guidelines.

## Commit style
- Use small, descriptive commits (e.g., `feat: add service level control`, `fix: clamp negative demand`).
- Keep messages in present tense and include the intent of the change.

## Developing locally
1. Install dependencies: `npm install`.
2. Run the dev server: `npm run dev`.
3. Lint before committing: `npm run lint`.
4. Format to maintain consistency: `npm run format`.

## Model changes
- Keep Monte Carlo simulations deterministic when seeding; reuse the existing seed utilities when possible.
- Avoid unbounded or blocking CPU loops; prefer capped iterations and well-defined grid searches.
- Explain any new stochastic assumption in the README and docs.
- Do not introduce backend services—this project must remain fully static.

