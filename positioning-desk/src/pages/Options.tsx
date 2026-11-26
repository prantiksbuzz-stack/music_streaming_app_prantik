import { useState } from 'react';
import { Guide, PageHeader, Segmented, NumberField, TextField, Card } from '../components/ui';
import { PrintButton } from '../components/viz';
import { PremiumSizer } from '../sections/PremiumSizer';
import { StrategyBuilder } from '../sections/StrategyBuilder';
import { INDEX_SPECS, SPECS_AS_OF } from '../config/instruments';
import { useSettings } from '../store';

type Tab = 'sizer' | 'builder';

export function IndexOptionsPage() {
  const lotSizes = useSettings((s) => s.lotSizes);
  const [key, setKey] = useState(INDEX_SPECS[0].key);
  const [tab, setTab] = useState<Tab>('sizer');
  const spec = INDEX_SPECS.find((s) => s.key === key)!;
  const lot = lotSizes[key] ?? spec.lotSize;
  return (
    <div>
      <PageHeader title="NIFTY & BANKNIFTY Options" subtitle={`Workbook "Nifty Options" sheet, upgraded · lot sizes as of ${SPECS_AS_OF} (edit them in Settings)`} icon="index" actions={<PrintButton />} />
      <Guide steps={[
        'Pick the index and enter your account and risk %. Keep risk at 1–2% unless you have a proven edge.',
        'Enter the option premium, your stop premium and (later) the highest premium seen, for the trailing SL.',
        'Read the lot-rounded quantity, the target ladder after charges, and the breakeven win rate. Then save it to the dashboard.',
      ]} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented layoutKey="idx" value={key} onChange={setKey} options={INDEX_SPECS.map((s) => ({ value: s.key, label: s.key }))} />
        <Segmented layoutKey="idx-tab" value={tab} onChange={setTab} options={[{ value: 'sizer', label: 'Premium risk sizer' }, { value: 'builder', label: 'Strategy builder' }]} />
      </div>
      {tab === 'sizer'
        ? <PremiumSizer key={key} name={spec.key} lotSize={lot} assetClass="Index Options" page="/index-options" />
        : <StrategyBuilder name={spec.key} lotSize={lot} step={spec.strikeStep} defaultSpot={spec.defaultSpot} defaultIV={spec.defaultIV} assetClass="Index Options" page="/index-options" />}
    </div>
  );
}

export function StockOptionsPage() {
  const [stock, setStock] = useState('RELIANCE');
  const [lot, setLot] = useState(500);
  const [step, setStep] = useState(10);
  const [spot, setSpot] = useState(1500);
  const [iv, setIv] = useState(0.24);
  const [tab, setTab] = useState<Tab>('sizer');
  return (
    <div>
      <PageHeader title="Stock Options" subtitle="Same engine as the index desk, for any F&O stock: enter its lot size from the NSE contract list" icon="stockopt" accent="from-brand2 to-brand" actions={<PrintButton />} />
      <Guide steps={[
        'Type the stock name and its F&O lot size. Stock lots are large, so one lot can blow through a small risk budget.',
        'Use the premium sizer for a directional option buy, or the builder for spreads and other multi-leg trades.',
        'Watch liquidity: wide bid-ask spreads in stock options add a hidden cost on top of the charges shown.',
      ]} />
      <Card className="mb-5" title="Contract" subtitle="Verify the lot size and strike interval on nseindia.com">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <TextField label="Stock" value={stock} onChange={(v) => setStock(v.toUpperCase())} />
          <NumberField label="Lot size" value={lot} onChange={(v) => setLot(Math.max(1, Math.round(v)))} min={1} />
          <NumberField label="Strike step" value={step} onChange={(v) => setStep(Math.max(0.5, v))} step={0.5} />
          <NumberField label="Spot" prefix="₹" value={spot} onChange={setSpot} step={1} />
          <NumberField label="IV" percent value={iv} onChange={setIv} step={0.01} />
        </div>
      </Card>
      <div className="mb-5"><Segmented layoutKey="stk-tab" value={tab} onChange={setTab} options={[{ value: 'sizer', label: 'Premium risk sizer' }, { value: 'builder', label: 'Strategy builder' }]} /></div>
      {tab === 'sizer'
        ? <PremiumSizer name={stock} lotSize={lot} assetClass="Stock Options" page="/stock-options" />
        : <StrategyBuilder name={stock} lotSize={lot} step={step} defaultSpot={spot} defaultIV={iv} assetClass="Stock Options" page="/stock-options" />}
    </div>
  );
}
