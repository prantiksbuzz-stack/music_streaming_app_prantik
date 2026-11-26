export const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', group: 'Overview', blurb: 'Portfolio heat, saved setups, compare' },
  { to: '/index-options', label: 'NIFTY / BANKNIFTY', icon: 'index', group: 'Indian F&O', blurb: 'Premium risk sizer + strategy builder' },
  { to: '/stock-options', label: 'Stock Options', icon: 'stockopt', group: 'Indian F&O', blurb: 'Lot-based sizing, payoff and Greeks' },
  { to: '/equity', label: 'Equity Delivery', icon: 'equity', group: 'Indian Cash', blurb: 'Risk sizing, charges and capital gains tax' },
  { to: '/intraday', label: 'Intraday Equity', icon: 'intraday', group: 'Indian Cash', blurb: 'Buying power, MIS leverage, cost drag' },
  { to: '/crypto', label: 'BTC / ETH', icon: 'crypto', group: 'Global', blurb: 'Leverage, liquidation, funding, INR view' },
  { to: '/gold', label: 'XAUUSD', icon: 'gold', group: 'Global', blurb: 'Lot sizing, pip value, margin, swap' },
  { to: '/renko', label: 'Renko Box Sizer', icon: 'renko', group: 'Tools', blurb: 'ATR box sizes for 1H / 30m / 15m' },
  { to: '/risk-lab', label: 'Risk Lab', icon: 'risklab', group: 'Tools', blurb: 'Monte Carlo equity & risk of ruin' },
  { to: '/journal', label: 'Trade Journal', icon: 'journal', group: 'Tools', blurb: 'Win rate, expectancy, R histogram' },
  { to: '/settings', label: 'Settings', icon: 'settings', group: 'Tools', blurb: 'Charges, lot sizes, defaults' },
] as const;
