# Positioning Desk

**Version 2.0.0** · Developed by [Prantik](https://linkedin.com/in/prantikdutta)

Live: https://prantiksbuzz-stack.github.io/positioning-desk/

Risk, position-size and P&L calculators for NIFTY/BANKNIFTY options, Indian equity (delivery and intraday), stock options, BTC/ETH and XAUUSD, plus a Renko box sizer, a Monte Carlo risk lab and a trade journal.

The whole app is one self-contained file: `index.html`. Open it in a browser, or serve this folder from any static host.

## Match-Trader specs (BTC/ETH and XAUUSD pages)

These come from the account's Match-Trader order tickets:

| Symbol | 1 lot | Leverage | Spread at capture | Commission |
|---|---|---|---|---|
| XAUUSD | 100 oz | 1:100 | 0.16 | $0 |
| BTCUSD | 1 BTC | 1:5 | 18.51 | $0 |
| ETHUSD | 1 ETH (assumed, same as BTC) | 1:5 (assumed) | enter manually | $0 (assumed) |

Swap and stop-out levels aren't shown on the order ticket, so you enter them in the app.

## Disclaimer

An educational risk-management calculator. It is not investment advice and not a SEBI-registered research or advisory service. All data you enter stays in your browser.
