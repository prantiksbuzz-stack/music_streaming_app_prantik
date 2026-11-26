# Positioning Desk

An interactive risk and position-sizing calculator for Indian and global markets. It is built from the formulas in `Risk_Management_Calculator.xlsx` and extends them with charges, tax, Greeks, liquidation maths and Monte Carlo analytics.

**Font:** Trebuchet MS throughout. **Data:** entered manually and stored only in your browser (localStorage).

## Calculators

| Page | Built on | Adds |
|---|---|---|
| NIFTY / BANKNIFTY options | "Nifty Options" sheet | Lot-floored sizing, R-ladder, TSL, breakeven win rate, F&O charges; strategy builder with 14 presets, payoff at expiry and at T+n, Greeks, P&L heatmap, probability of profit |
| Stock options | Same engine | Any stock with your own lot size and strike step |
| Equity delivery | "Indian Market" sheet | Whole-share rounding ("Excel exact" toggle), delivery charges, STCG/LTCG, annualised return |
| Intraday equity | "Sheet2" | Buying power + risk cap → final qty, MIS charges, breakeven move, cost-drag ring |
| BTC / ETH | "BTC Trade (USD)" sheet | Long/short, liquidation price and max safe leverage, fees, funding, USD⇄INR, 30% VDA tax + 1% TDS |
| XAUUSD | — | Lots from risk, pip/point value, margin level, swap, commission |
| Renko box sizer | "Sheet3" | Editable watchlist (pre-filled with your 24 names + BTC/ETH), 15m box, noise ranking, CSV import/export |
| Risk Lab | — | 100-path Monte Carlo, risk of ruin, drawdown histogram, Kelly, bet-size comparison, breakeven-vs-R:R curve |
| Trade journal | — | Win rate, expectancy, profit factor, R histogram, P&L by asset class / weekday, CSV import/export |
| Dashboard | — | Portfolio heat gauge, risk by asset class, saved setups, compare up to 3, workbook audit |

Every page has **Guided** mode (steps, plain-language tooltips) and **Pro** mode, plus light and dark themes, print-to-PDF and full mobile support.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 26 formula tests, including the workbook's own numbers
npm run build    # static site in dist/ (works on Netlify, Vercel, GitHub Pages)
```

## Where things live

- `src/lib/calc/`: pure formula modules (sizing, margin, renko, crypto, forex, charges, options, montecarlo, journal) and `calc.test.ts`
- `src/config/charges.ts`: Indian charge rates as of 1 April 2026 (STT on F&O as revised in Budget 2026-27). Editable in Settings.
- `src/config/instruments.ts`: lot sizes (NIFTY 65, BANKNIFTY 30), XAU contract, USDINR default
- `src/pages/`, `src/sections/`, `src/components/`: UI (React, Tailwind, Framer Motion, Recharts)

## Disclaimer

Educational tool only. It is not investment advice and not a SEBI-registered service. Verify charges, lot sizes and tax rules with your broker and the exchange circulars.
