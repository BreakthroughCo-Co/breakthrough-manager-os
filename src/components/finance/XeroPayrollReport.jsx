import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import { Users, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  POSTED: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-amber-100 text-amber-700',
  PAID: 'bg-blue-100 text-blue-700',
};

export default function XeroPayrollReport() {
  const { isDark } = useTheme();
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingSlips, setLoadingSlips] = useState(null);
  const [payRuns, setPayRuns] = useState([]);
  const [payslips, setPayslips] = useState({});
  const [expanded, setExpanded] = useState(null);

  const fetchPayRuns = async () => {
    setLoadingRuns(true);
    const res = await base44.functions.invoke('xeroSync', { action: 'get_pay_runs', status: 'POSTED' });
    setPayRuns(res.data?.pay_runs || []);
    setLoadingRuns(false);
  };

  const toggleExpand = async (run) => {
    const id = run.PayRunID;
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!payslips[id]) {
      setLoadingSlips(id);
      const res = await base44.functions.invoke('xeroSync', { action: 'get_payslips', pay_run_id: id });
      setPayslips(prev => ({ ...prev, [id]: res.data?.payslips || [] }));
      setLoadingSlips(null);
    }
  };

  return (
    <div className={cn("rounded-xl border p-5 space-y-4", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-500" />
          <h3 className="font-semibold text-sm">Payroll</h3>
        </div>
        <Button size="sm" onClick={fetchPayRuns} disabled={loadingRuns} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
          {loadingRuns ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loadingRuns ? 'Loading...' : 'Fetch Pay Runs'}
        </Button>
      </div>

      {payRuns.length > 0 ? (
        <div className="space-y-2">
          {payRuns.map((run, i) => (
            <div key={i} className={cn("rounded-lg border overflow-hidden", isDark ? "border-slate-700" : "border-slate-200")}>
              <button
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left",
                  isDark ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-50 hover:bg-slate-100"
                )}
                onClick={() => toggleExpand(run)}
              >
                <div className="flex items-center gap-2">
                  {expanded === run.PayRunID
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <div>
                    <p className="text-sm font-medium">Pay Run — Period ending {run.PaymentDate?.split('T')[0]}</p>
                    <p className="text-xs text-slate-400">{run.PayRunPeriodStartDate?.split('T')[0]} → {run.PayRunPeriodEndDate?.split('T')[0]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${(run.Wages || 0).toFixed(2)}</span>
                  <Badge className={cn("text-xs", STATUS_COLORS[run.PayRunStatus] || 'bg-slate-100 text-slate-600')}>
                    {run.PayRunStatus}
                  </Badge>
                </div>
              </button>

              {expanded === run.PayRunID && (
                <div className="px-3 pb-3">
                  {loadingSlips === run.PayRunID ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading payslips...
                    </div>
                  ) : payslips[run.PayRunID]?.length > 0 ? (
                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className={cn(isDark ? "text-slate-400" : "text-slate-500")}>
                          <th className="text-left pb-1">Employee</th>
                          <th className="text-right pb-1">Gross</th>
                          <th className="text-right pb-1">Tax</th>
                          <th className="text-right pb-1">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payslips[run.PayRunID].map((slip, j) => (
                          <tr key={j} className={cn("border-t", isDark ? "border-slate-800" : "border-slate-100")}>
                            <td className="py-1">{slip.FirstName} {slip.LastName}</td>
                            <td className="py-1 text-right tabular-nums">${(slip.GrossPay || 0).toFixed(2)}</td>
                            <td className="py-1 text-right tabular-nums text-red-500">${(slip.TotalTax || 0).toFixed(2)}</td>
                            <td className="py-1 text-right tabular-nums font-medium">${(slip.NetPay || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={cn("border-t font-semibold", isDark ? "border-slate-700" : "border-slate-200")}>
                          <td className="pt-1">Total</td>
                          <td className="pt-1 text-right tabular-nums">
                            ${payslips[run.PayRunID].reduce((s, p) => s + (p.GrossPay || 0), 0).toFixed(2)}
                          </td>
                          <td className="pt-1 text-right tabular-nums text-red-500">
                            ${payslips[run.PayRunID].reduce((s, p) => s + (p.TotalTax || 0), 0).toFixed(2)}
                          </td>
                          <td className="pt-1 text-right tabular-nums">
                            ${payslips[run.PayRunID].reduce((s, p) => s + (p.NetPay || 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">No payslips available for this pay run.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !loadingRuns && (
        <p className="text-xs text-slate-400">Click Fetch Pay Runs to load payroll data from Xero.</p>
      )}
    </div>
  );
}