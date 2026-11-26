/** Intraday buying-power calculator — mirrors "Sheet2" of the workbook. */
export interface MarginInput {
  margin: number;
  leverage: number;
  ltp: number;
  /** optional quantity cap from risk-based sizing */
  riskQty?: number;
}

export interface MarginResult {
  buyingPower: number;
  maxShares: number;
  positionValue: number;
  marginUsed: number;
  remainingMargin: number;
  unusedBuyingPower: number;
  /** the binding quantity: min(margin cap, risk cap) */
  finalQty: number;
  limitedBy: 'margin' | 'risk';
  finalValue: number;
  finalMargin: number;
  utilisation: number;
}

export function computeMargin({ margin, leverage, ltp, riskQty }: MarginInput): MarginResult {
  const buyingPower = Math.max(0, margin * leverage);
  const maxShares = ltp > 0 ? Math.floor(buyingPower / ltp + 1e-9) : 0;
  const positionValue = maxShares * ltp;
  const marginUsed = leverage > 0 ? positionValue / leverage : 0;
  const cap = riskQty !== undefined ? Math.floor(riskQty + 1e-9) : Infinity;
  const finalQty = Math.min(maxShares, cap);
  const finalValue = finalQty * ltp;
  const finalMargin = leverage > 0 ? finalValue / leverage : 0;
  return {
    buyingPower,
    maxShares,
    positionValue,
    marginUsed,
    remainingMargin: margin - marginUsed,
    unusedBuyingPower: buyingPower - positionValue,
    finalQty,
    limitedBy: cap < maxShares ? 'risk' : 'margin',
    finalValue,
    finalMargin,
    utilisation: margin > 0 ? finalMargin / margin : 0,
  };
}
