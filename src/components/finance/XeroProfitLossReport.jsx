import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { TrendingUp, Loader2, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function ReportRow({ row, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const { isDark } = useTheme();
  const hasChildren = row.Rows && row.Rows.length > 0;

  if (row.RowType === 'Header') {
    return (
      <tr className={cn("text-xs font-bold uppercase tracking-wide", isDark ? "text-slate-400 bg-slate-900" : "text-slate-500 bg-slate-50")}>
        {row.Cells?.map((c, i) => (
          <td key={i} className={cn("px-3 py-1.5", i > 0 && "text-right")}>{c.Value}</td>
        ))}
      </tr>
    );
  }

  if (row.RowType === 'SummaryRow') {
    return (
      <tr className={cn("text-sm font-semibold border-t", isDark ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-800")}>
        {row.Cells?.map((c, i) => (
          <td key={i} className={cn("px-3 py-1.5", i > 0 && "text-right")}>{c.Value}</td>
        ))}
      </tr>
    );
  }

  if (row.RowType === 'Section') {
    return (
      <>
        {row.Title && (
          <tr
            className={cn("cursor-pointer text-xs font-semibold uppercase tracking-wide select-none",
              isDark ? "text-teal-400 hover:bg-slate-800" : "text-teal-700 hover:bg-teal-50"
            )}
            onClick={() => hasChildren && setOpen(v => !v)}
          >
            <td className="px-3 py-1.5 flex items-center gap-1" colSpan={99}>
              {hasChildren && <span>{open ? '▾' : '▸'}</span>} {row.Title}
            </td>
          </tr>
        )}
        {open && row.Rows?.map((child, i) => <ReportRow key={i} row={child} depth={depth + 1} />)}
      </>
    );
  }

  if (row.RowType === 'Row') {
    return (
      <tr className={cn(
        "text-sm border-t hover:opacity-80",
        isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-700"
      )}>
        {row.Cells?.map((c, i) => (
          <td
            key={i}
            className={cn("px-3 py-1", i > 0 && "text-right tabular-nums", i === 0 && `pl-${4 + depth * 4}`)}
          >
            {c.Value}
          </td>
        ))}
      </tr>
    );
  }

  return null;
}

export default function XeroProfitLossReport() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetch = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('xeroSync', {
      action: 'get_profit_loss',
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    });
    setReport(res.data?.report || null);
    setPeriod(res.data?.period || null);
    setLoading(false);
  };

  return (
    <div className={cn("rounded-xl border p-5 space-y-4", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          <h3 className="font-semibold text-sm">Profit & Loss</h3>
          {period && <Badge variant="outline" className="text-xs">{period.from} → {period.to}</Badge>}
        </div>
        <Button size="sm" onClick={fetch} disabled={loading} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Loading...' : 'Fetch'}
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <Input type="date" className="h-7 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
        <span className="text-xs text-slate-400">to</span>
        <Input type="date" className="h-7 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
        <span className="text-xs text-slate-400">(blank = current FY)</span>
      </div>

      {report ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <tbody>
              {report.Rows?.map((row, i) => <ReportRow key={i} row={row} />)}
            </tbody>
          </table>
        </div>
      ) : !loading && (
        <p className="text-xs text-slate-400">Click Fetch to load the Profit & Loss report from Xero.</p>
      )}
    </div>
  );
}