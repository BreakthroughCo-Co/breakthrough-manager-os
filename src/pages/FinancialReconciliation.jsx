import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, PlayCircle, Upload, TrendingUp, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import NDISClaimImport from '@/components/reconciliation/NDISClaimImport';
import DiscrepancyTable from '@/components/reconciliation/DiscrepancyTable';
import FundingUtilisationPanel from '@/components/reconciliation/FundingUtilisationPanel';
import { Zap } from 'lucide-react';

export default function FinancialReconciliation() {
    const [runningRecon, setRunningRecon] = useState(false);
    const [runningFunding, setRunningFunding] = useState(false);
    const [runningAnomalyDetect, setRunningAnomalyDetect] = useState(false);
    const [lastReconResult, setLastReconResult] = useState(null);
    const [lastFundingResult, setLastFundingResult] = useState(null);
    const [lastAnomalyResult, setLastAnomalyResult] = useState(null);
    const [activeTab, setActiveTab] = useState('discrepancies');

    const { data: discrepancies = [], isLoading: loadingDisc, refetch: refetchDisc } = useQuery({
        queryKey: ['financial_discrepancies'],
        queryFn: () => base44.entities.FinancialDiscrepancy.list('-created_date', 200)
    });

    // Latest funding reports — one per client (most recent by report_date)
    const { data: allFundingReports = [], isLoading: loadingFunding, refetch: refetchFunding } = useQuery({
        queryKey: ['funding_utilisation_reports'],
        queryFn: () => base44.entities.FundingUtilisationReport.list('-report_date', 500)
    });

    // Deduplicate: keep latest report per client
    const latestFundingReports = React.useMemo(() => {
        const seen = new Map();
        for (const r of allFundingReports) {
            if (!seen.has(r.client_id) || r.report_date > seen.get(r.client_id).report_date) {
                seen.set(r.client_id, r);
            }
        }
        return Array.from(seen.values());
    }, [allFundingReports]);

    const { data: claims = [], isLoading: loadingClaims, refetch: refetchClaims } = useQuery({
        queryKey: ['ndis_claims'],
        queryFn: () => base44.entities.NDISClaimData.list('-created_date', 200)
    });

    const openDiscrepancies = discrepancies.filter(d => d.status === 'new' || d.status === 'investigating');
    const criticalCount = discrepancies.filter(d => d.severity === 'critical' && d.status !== 'resolved' && d.status !== 'dismissed').length;
    const totalVariance = openDiscrepancies.reduce((sum, d) => sum + Math.abs(d.variance_amount || 0), 0);

    const runReconciliation = async () => {
        setRunningRecon(true);
        setLastReconResult(null);
        const result = await base44.functions.invoke('reconcileFinancialRecords', {});
        setLastReconResult(result.data);
        setRunningRecon(false);
        refetchDisc();
    };

    const runFundingReport = async () => {
        setRunningFunding(true);
        setLastFundingResult(null);
        const result = await base44.functions.invoke('generateFundingUtilisationReport', {});
        setLastFundingResult(result.data);
        setRunningFunding(false);
        refetchFunding();
    };

    const runAnomalyDetection = async () => {
        setRunningAnomalyDetect(true);
        setLastAnomalyResult(null);
        const result = await base44.functions.invoke('detectBillingAnomalies', {});
        setLastAnomalyResult(result.data);
        setRunningAnomalyDetect(false);
        refetchDisc();
    };

    const handleImportComplete = useCallback(() => {
        refetchClaims();
    }, [refetchClaims]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Financial Reconciliation</h2>
                    <p className="text-sm text-slate-500 mt-0.5">AI-powered matching of internal billing records against NDIS claim data.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={runFundingReport}
                        disabled={runningFunding}
                        className="gap-2"
                    >
                        {runningFunding ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                        Run Funding Report
                    </Button>
                    <Button
                        size="sm"
                        onClick={runAnomalyDetection}
                        disabled={runningAnomalyDetect}
                        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {runningAnomalyDetect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Anomaly Scan
                    </Button>
                    <Button
                        size="sm"
                        onClick={runReconciliation}
                        disabled={runningRecon}
                        className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        {runningRecon ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Run Reconciliation
                    </Button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Open Discrepancies</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{openDiscrepancies.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
                    <p className="text-xs text-red-500 uppercase tracking-wide">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">$ at Risk (Open)</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">${totalVariance.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Claim Records Loaded</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{claims.length}</p>
                </div>
            </div>

            {/* Run results */}
            {lastReconResult && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm">
                    <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="text-teal-800 dark:text-teal-300 font-medium">Reconciliation complete — Run ID: <code className="text-xs">{lastReconResult.run_id}</code></span>
                    <span className="text-teal-700 dark:text-teal-400">{lastReconResult.billing_records_processed} billing records · {lastReconResult.claims_processed} claims · {lastReconResult.discrepancies_found} discrepancies found</span>
                    {lastReconResult.summary?.critical > 0 && (
                        <Badge className="bg-red-100 text-red-800">{lastReconResult.summary.critical} Critical</Badge>
                    )}
                </div>
            )}
            {lastFundingResult && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm">
                    <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
                    <span className="text-teal-800 dark:text-teal-300 font-medium">Funding report generated — {lastFundingResult.clients_analysed} clients analysed · {lastFundingResult.at_risk_count} at risk</span>
                </div>
            )}

            {/* NDIS Claim Import */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Import NDIS Claim Statement
                </p>
                <NDISClaimImport onImportComplete={handleImportComplete} />
            </div>

            {/* Main tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100 dark:bg-slate-800">
                    <TabsTrigger value="discrepancies" className="flex items-center gap-2">
                        Discrepancies
                        {openDiscrepancies.length > 0 && (
                            <Badge className="bg-red-500 text-white text-xs h-4 px-1.5">{openDiscrepancies.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="funding">Funding Utilisation</TabsTrigger>
                    <TabsTrigger value="claims">Claim Register</TabsTrigger>
                </TabsList>

                <TabsContent value="discrepancies" className="mt-4">
                    {loadingDisc ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <DiscrepancyTable discrepancies={discrepancies} onRefresh={refetchDisc} />
                    )}
                </TabsContent>

                <TabsContent value="funding" className="mt-4">
                    {loadingFunding ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <FundingUtilisationPanel reports={latestFundingReports} />
                    )}
                </TabsContent>

                <TabsContent value="claims" className="mt-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    {['Client', 'Claim #', 'Service Date', 'Line Item', 'Hours', 'Amount', 'Status', 'Batch'].map(h => (
                                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loadingClaims ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
                                ) : claims.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">No NDIS claim data imported yet.</td></tr>
                                ) : (
                                    claims.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-4 py-2.5 font-medium">{c.client_name || c.client_id}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs">{c.claim_number}</td>
                                            <td className="px-4 py-2.5">{c.service_date}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs">{c.ndis_line_item}</td>
                                            <td className="px-4 py-2.5">{c.claimed_hours}</td>
                                            <td className="px-4 py-2.5 font-mono">${(c.claimed_amount || 0).toFixed(2)}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge className={cn('text-xs',
                                                    c.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    c.status === 'queried' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-slate-100 text-slate-700'
                                                )}>{c.status}</Badge>
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{c.batch_id?.replace('batch_', '') || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}