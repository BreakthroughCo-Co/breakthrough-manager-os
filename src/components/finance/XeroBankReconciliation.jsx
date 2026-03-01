import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Landmark, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function XeroBankReconciliation() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetch = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('xeroSync', { action: 'get_reconciliation_summary' });
    setSummary(res.data || null);
    setLoading(false);
  };

  return (
    <div className={cn("rounded-xl border p-5 space-y-4", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-teal-500" />
          <h3 className="font-semibold text-sm">Bank Reconciliation</h3>
        </div>
        <Button size="sm" onClick={fetch} disabled={loading} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Syncing...' : 'Sync Xero'}
        </Button>
      </div>

      {summary ? (
        <div className="space-y-3">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cn("rounded-lg p-3 border text-center", isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200")}>
              <p className="text-xs text-slate-400">Total Transactions</p>
              <p className="text-xl font-bold mt-0.5">{summary.total_transactions}</p>
            </div>
            <div className={cn("rounded-lg p-3 border text-center", summary.unreconciled_count > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
              <p className="text-xs text-slate-400">Unreconciled</p>
              <p className={cn("text-xl font-bold mt-0.5", summary.unreconciled_count > 0 ? "text-amber-600" : "text-emerald-600")}>
                {summary.unreconciled_count}
              </p>
            </div>
            <div className={cn("rounded-lg p-3 border text-center", isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200")}>
              <p className="text-xs text-slate-400">Unreconciled Total</p>
              <p className="text-xl font-bold mt-0.5">${(summary.unreconciled_total || 0).toFixed(2)}</p>
            </div>
          </div>

          {summary.unreconciled_count > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {summary.unreconciled_count} transaction{summary.unreconciled_count > 1 ? 's require' : ' requires'} reconciliation in Xero.
            </div>
          )}

          {summary.unreconciled_count === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              All transactions are reconciled.
            </div>
          )}

          {/* By Account */}
          {summary.by_account?.map((acct, i) => (
            <div key={i} className={cn("rounded-lg border overflow-hidden", isDark ? "border-slate-700" : "border-slate-200")}>
              <button
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-left",
                  isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-50 hover:bg-slate-100"
                )}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span>{acct.account_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{acct.count} tx</Badge>
                  <Badge variant="outline" className="text-xs">${acct.total.toFixed(2)}</Badge>
                  <span className="text-xs text-slate-400">{expanded === i ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === i && (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={cn(isDark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500")}>
                        <th className="px-3 py-1.5 text-left">Date</th>
                        <th className="px-3 py-1.5 text-left">Contact</th>
                        <th className="px-3 py-1.5 text-left">Reference</th>
                        <th className="px-3 py-1.5 text-right">Amount</th>
                        <th className="px-3 py-1.5 text-center">Reconciled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acct.transactions.map((tx, j) => (
                        <tr key={j} className={cn("border-t", isDark ? "border-slate-800" : "border-slate-100")}>
                          <td className="px-3 py-1">{tx.date?.split('T')[0]}</td>
                          <td className="px-3 py-1">{tx.contact || '—'}</td>
                          <td className="px-3 py-1">{tx.reference || '—'}</td>
                          <td className="px-3 py-1 text-right tabular-nums">${(tx.total || 0).toFixed(2)}</td>
                          <td className="px-3 py-1 text-center">
                            {tx.is_reconciled
                              ? <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />
                              : <AlertTriangle className="w-3 h-3 text-amber-500 inline" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !loading && (
        <p className="text-xs text-slate-400">Click Sync to retrieve bank reconciliation data from Xero.</p>
      )}
    </div>
  );
}