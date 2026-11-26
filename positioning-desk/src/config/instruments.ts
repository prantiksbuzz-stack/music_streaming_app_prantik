/** Contract specifications — editable defaults. Verify with NSE circulars before trading. */
export interface IndexSpec {
  key: string;
  label: string;
  lotSize: number;
  strikeStep: number;
  defaultSpot: number;
  defaultIV: number;
}

export const INDEX_SPECS: IndexSpec[] = [
  // NIFTY lot 65 is taken from the user's workbook
  { key: 'NIFTY', label: 'NIFTY 50', lotSize: 65, strikeStep: 50, defaultSpot: 26000, defaultIV: 0.12 },
  { key: 'BANKNIFTY', label: 'BANK NIFTY', lotSize: 30, strikeStep: 100, defaultSpot: 59000, defaultIV: 0.14 },
];

export const SPECS_AS_OF = 'Nov 2026';

export const CRYPTO_SPECS = {
  BTC: { label: 'Bitcoin', symbol: 'BTC', defaultEntry: 74493, defaultStopGap: 250, band: 500, renkoBase: 2500 },
  ETH: { label: 'Ethereum', symbol: 'ETH', defaultEntry: 2650, defaultStopGap: 15, band: 30, renkoBase: 120 },
} as const;

export const XAU_SPEC = { contractSize: 100, lotStep: 0.01, defaultEntry: 4050, defaultStopGap: 8 };

export const DEFAULT_USDINR = 92.46; // implied by the workbook's cached GOOGLEFINANCE values
