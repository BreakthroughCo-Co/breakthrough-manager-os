import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Calculator, Plus, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// 2024-25 NDIS price guide rates (AUD) - Behaviour Support line items
const NDIS_RATES = [
  { code: '07_002_0106_6_3', label: 'Behaviour Support — Practitioner', rate: 193.99, unit: 'hour' },
  { code: '07_004_0106_6_3', label: 'Behaviour Support — Senior Practitioner', rate: 214.41, unit: 'hour' },
  { code: '07_001_0106_6_3', label: 'Behaviour Support — Allied Health Assistant', rate: 104.48, unit: 'hour' },
  { code: '07_003_0106_6_3', label: 'Behaviour Support — Practice Lead', rate: 243.75, unit: 'hour' },
  { code: '04_104_0125_6_1', label: 'Capacity Building — Life Skills', rate: 65.09, unit: 'hour' },
  { code: '04_210_0125_6_1', label: 'Therapeutic Supports', rate: 193.99, unit: 'hour' },
  { code: '01_011_0107_1_1', label: 'Daily Activities — Standard', rate: 65.09, unit: 'hour' },
  { code: '01_013_0107_1_1', label: 'Daily Activities — Evening', rate: 71.67, unit: 'hour' },
  { code: '01_015_0107_1_1', label: 'Daily Activities — Saturday', rate: 91.37, unit: 'hour' },
  { code: '01_017_0107_1_1', label: 'Daily Activities — Sunday', rate: 117.64, unit: 'hour' },
  { code: '01_019_0107_1_1', label: 'Daily Activities — Public Holiday', rate: 143.90, unit: 'hour' },
  { code: 'CUSTOM', label: 'Custom Line Item', rate: 0, unit: 'hour' },
];

const DEFAULT_LINE = { code: '07_002_0106_6_3', label: 'Behaviour Support — Practitioner', rate: 193.99, hours: 1, customRate: '' };

export default function NDISCalculator() {
  const { isDark } = useTheme();
  const [lines, setLines] = useState([{ ...DEFAULT_LINE, id: 1 }]);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [planBudget, setPlanBudget] = useState('');
  const [existingSpend, setExistingSpend] = useState('');

  const addLine = () => setLines(prev => [...prev, { ...DEFAULT_LINE, id: Date.now() }]);
  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id));

  const updateLine = (id, field, value) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (field === 'code') {
        const found = NDIS_RATES.find(r => r.code === value);
        return { ...l, code: value, label: found?.label || '', rate: found?.rate || 0, customRate: '' };
      }
      return { ...l, [field]: value };
    }));
  };

  const subtotal = useMemo(() =>
    lines.reduce((sum, l) => {
      const rate = l.code === 'CUSTOM' ? parseFloat(l.customRate) || 0 : l.rate;
      return sum + rate * (parseFloat(l.hours) || 0);
    }, 0), [lines]);

  const gst = gstApplicable ? subtotal * 0.1 : 0;
  const total = subtotal + gst;
  const budgetNum = parseFloat(planBudget) || 0;
  const spendNum = parseFloat(existingSpend) || 0;
  const remaining = budgetNum - spendNum - total;

  const exportCSV = () => {
    const rows = [
      ['Support Item Code', 'Description', 'Rate ($/hr)', 'Hours', 'Subtotal'],
      ...lines.map(l => {
        const rate = l.code === 'CUSTOM' ? parseFloat(l.customRate) || 0 : l.rate;
        return [l.code, l.label, rate.toFixed(2), l.hours, (rate * l.hours).toFixed(2)];
      }),
      [],
      ['', '', '', 'Subtotal', subtotal.toFixed(2)],
      gstApplicable ? ['', '', '', 'GST (10%)', gst.toFixed(2)] : [],
      ['', '', '', 'TOTAL', total.toFixed(2)],
    ].filter(r => r.length);

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ndis_estimate_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("space-y-6", isDark ? "text-slate-50" : "text-slate-900")}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-teal-500" />
            NDIS Funding Calculator
          </h2>
          <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            2024–25 price guide rates · Behaviour Support & Capacity Building
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className={cn(
            "rounded-xl border overflow-hidden",
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}>
            <div className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
            )}>
              <h3 className="text-sm font-semibold">Service Line Items</h3>
              <Button size="sm" onClick={addLine} className="h-7 bg-teal-600 hover:bg-teal-700 gap-1">
                <Plus className="w-3 h-3" /> Add Line
              </Button>
            </div>

            <div className="p-4 space-y-3">
              {lines.map((line, idx) => {
                const rate = line.code === 'CUSTOM' ? parseFloat(line.customRate) || 0 : line.rate;
                const lineTotal = rate * (parseFloat(line.hours) || 0);
                return (
                  <div key={line.id} className={cn(
                    "grid grid-cols-12 gap-2 items-end p-3 rounded-lg border",
                    isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="col-span-12 md:col-span-5">
                      <Label className="text-xs mb-1 block">Support Item</Label>
                      <Select value={line.code} onValueChange={v => updateLine(line.id, 'code', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NDIS_RATES.map(r => (
                            <SelectItem key={r.code} value={r.code} className="text-xs">
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs mb-1 block">
                        {line.code === 'CUSTOM' ? 'Rate ($/hr)' : `Rate: $${line.rate}/hr`}
                      </Label>
                      {line.code === 'CUSTOM' ? (
                        <Input
                          type="number"
                          value={line.customRate}
                          onChange={e => updateLine(line.id, 'customRate', e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                      ) : (
                        <div className={cn(
                          "h-8 px-3 flex items-center text-xs rounded-md border",
                          isDark ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                        )}>
                          ${line.rate.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs mb-1 block">Hours</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.hours}
                        onChange={e => updateLine(line.id, 'hours', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Label className="text-xs mb-1 block">Total</Label>
                      <div className="h-8 flex items-center text-sm font-semibold text-teal-600">
                        ${lineTotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GST Toggle */}
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border",
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}>
            <input
              type="checkbox"
              id="gst"
              checked={gstApplicable}
              onChange={e => setGstApplicable(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="gst" className="text-sm">Apply GST (10%) — for GST-registered providers</label>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <div className={cn(
            "rounded-xl border p-5 space-y-4",
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}>
            <h3 className="font-semibold text-sm">Estimate Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {gstApplicable && (
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>GST (10%)</span>
                  <span className="font-medium">${gst.toFixed(2)}</span>
                </div>
              )}
              <div className={cn(
                "flex justify-between pt-2 border-t font-bold text-base",
                isDark ? "border-slate-600" : "border-slate-200"
              )}>
                <span>Total</span>
                <span className="text-teal-500">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className={cn("h-px", isDark ? "bg-slate-700" : "bg-slate-200")} />

            {/* Budget Tracking */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plan Budget Tracker</h4>
              <div>
                <Label className="text-xs mb-1 block">Plan Budget ($)</Label>
                <Input
                  type="number"
                  value={planBudget}
                  onChange={e => setPlanBudget(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Existing Spend ($)</Label>
                <Input
                  type="number"
                  value={existingSpend}
                  onChange={e => setExistingSpend(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm"
                />
              </div>
              {budgetNum > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Remaining after this estimate</span>
                    <span className={cn("font-bold", remaining < 0 ? "text-red-500" : "text-emerald-500")}>
                      ${remaining.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        ((spendNum + total) / budgetNum) > 0.9 ? "bg-red-500" :
                        ((spendNum + total) / budgetNum) > 0.7 ? "bg-amber-500" : "bg-teal-500"
                      )}
                      style={{ width: `${Math.min(100, ((spendNum + total) / budgetNum) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className={cn("text-xs text-right", isDark ? "text-slate-400" : "text-slate-500")}>
                    {(((spendNum + total) / budgetNum) * 100).toFixed(1)}% utilised
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rate Reference */}
          <div className={cn(
            "rounded-xl border p-4 space-y-2",
            isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
          )}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick Reference</h4>
            {NDIS_RATES.filter(r => r.code !== 'CUSTOM').slice(0, 5).map(r => (
              <div key={r.code} className="flex justify-between text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"} title={r.code}>{r.label.split('—')[1]?.trim()}</span>
                <span className="font-medium">${r.rate}/hr</span>
              </div>
            ))}
            <p className={cn("text-xs pt-1 border-t", isDark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400")}>
              Rates: NDIS Price Guide 2024–25
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}