import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const riskConfig = {
    critical:      { label: 'Critical',       cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',    icon: AlertTriangle, bar: 'bg-red-500' },
    over_utilised: { label: 'Over-Utilised',  cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: TrendingUp, bar: 'bg-orange-500' },
    under_utilised:{ label: 'Under-Utilised', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: TrendingDown, bar: 'bg-yellow-500' },
    on_track:      { label: 'On Track',       cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',  icon: CheckCircle, bar: 'bg-teal-500' }
};

function ClientFundingCard({ report }) {
    const risk = riskConfig[report.risk_level] || riskConfig.on_track;
    const Icon = risk.icon;
    const pct = Math.min(100, Math.max(0, report.utilisation_percentage || 0));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{report.client_name}</p>
                <Badge className={cn('text-xs flex items-center gap-1', risk.cls)}>
                    <Icon className="h-3 w-3" />{risk.label}
                </Badge>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>${(report.utilised_funding || 0).toLocaleString('en-AU', { minimumFractionDigits: 0 })} used</span>
                    <span>${(report.total_funding || 0).toLocaleString('en-AU', { minimumFractionDigits: 0 })} total</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                    <div className={cn("h-2 rounded-full transition-all", risk.bar)} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-right text-slate-400">{pct.toFixed(1)}% utilised</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2">
                    <p className="text-slate-400">Remaining</p>
                    <p className={cn("font-semibold", (report.remaining_funding || 0) < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200')}>
                        ${(report.remaining_funding || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2">
                    <p className="text-slate-400">Weekly Burn</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                        ${(report.burn_rate_weekly || 0).toFixed(2)}/wk
                    </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2">
                    <p className="text-slate-400">Weeks Remaining</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{(report.weeks_remaining_in_plan || 0).toFixed(1)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2">
                    <p className="text-slate-400">Projected Balance</p>
                    <p className={cn("font-semibold", (report.projected_end_balance || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                        {(report.projected_end_balance || 0) >= 0 ? '+' : ''}${(report.projected_end_balance || 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {report.estimated_depletion_date && report.risk_level !== 'on_track' && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Estimated depletion: {report.estimated_depletion_date}
                </div>
            )}

            {report.ai_insights && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded p-2">
                    <p className="text-xs text-teal-700 dark:text-teal-400 flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />{report.ai_insights}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function FundingUtilisationPanel({ reports }) {
    const sorted = [...reports].sort((a, b) => {
        const order = { critical: 0, over_utilised: 1, under_utilised: 2, on_track: 3 };
        return (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
    });

    const counts = {
        critical: reports.filter(r => r.risk_level === 'critical').length,
        over_utilised: reports.filter(r => r.risk_level === 'over_utilised').length,
        under_utilised: reports.filter(r => r.risk_level === 'under_utilised').length,
        on_track: reports.filter(r => r.risk_level === 'on_track').length
    };

    return (
        <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-3">
                {Object.entries(counts).map(([key, count]) => {
                    const risk = riskConfig[key];
                    const Icon = risk.icon;
                    return (
                        <div key={key} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", key === 'on_track' ? 'text-teal-500' : key === 'critical' ? 'text-red-500' : key === 'over_utilised' ? 'text-orange-500' : 'text-yellow-500')} />
                            <div>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                                <p className="text-xs text-slate-400">{risk.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Client cards */}
            {sorted.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No funding utilisation reports available. Run the report generator to populate data.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sorted.map(report => <ClientFundingCard key={report.id} report={report} />)}
                </div>
            )}
        </div>
    );
}