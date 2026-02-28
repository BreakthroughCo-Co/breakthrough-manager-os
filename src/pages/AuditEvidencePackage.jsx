import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageOpen, Download, FileCheck, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import AuditPackageSectionSelector, { SECTIONS } from '@/components/audit/AuditPackageSectionSelector';

function summarisePackage(data) {
    const counts = {};
    SECTIONS.forEach(s => {
        if (Array.isArray(data[s.id])) counts[s.id] = data[s.id].length;
    });
    return counts;
}

export default function AuditEvidencePackage() {
    const { isDark } = useTheme();
    const [selectedSections, setSelectedSections] = useState(SECTIONS.map(s => s.id));
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [packageData, setPackageData] = useState(null);
    const [error, setError] = useState(null);

    const generate = async () => {
        if (!selectedSections.length) return;
        setLoading(true);
        setError(null);
        setPackageData(null);
        try {
            const res = await base44.functions.invoke('generateAuditPackage', {
                sections: selectedSections,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setPackageData(res.data);
        } catch (e) {
            setError(e.message || 'Failed to generate package.');
        } finally {
            setLoading(false);
        }
    };

    const downloadJSON = () => {
        if (!packageData) return;
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-evidence-package-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadCSV = (sectionId, label) => {
        const rows = packageData?.[sectionId];
        if (!rows?.length) return;
        const keys = Object.keys(rows[0]);
        const csvContent = [
            keys.join(','),
            ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sectionId}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const counts = packageData ? summarisePackage(packageData) : {};

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className={cn("text-xl font-semibold flex items-center gap-2", isDark ? "text-slate-50" : "text-slate-900")}>
                        <ShieldCheck className="h-5 w-5 text-teal-500" />
                        Audit Evidence Package
                    </h1>
                    <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                        Generate a timestamped, exportable evidence bundle for NDIS audits, compliance reviews, or NDIS Commission submissions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Config */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                        <CardHeader className="pb-3">
                            <CardTitle className={cn("text-sm", isDark ? "text-slate-200" : "text-slate-700")}>Evidence Scope</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Date range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className={cn("text-xs mb-1 block", isDark ? "text-slate-400" : "text-slate-500")}>Period From</Label>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className={cn(isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "")}
                                    />
                                </div>
                                <div>
                                    <Label className={cn("text-xs mb-1 block", isDark ? "text-slate-400" : "text-slate-500")}>Period To</Label>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className={cn(isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "")}
                                    />
                                </div>
                            </div>
                            {/* Sections */}
                            <AuditPackageSectionSelector selected={selectedSections} onChange={setSelectedSections} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Actions & Summary */}
                <div className="space-y-4">
                    <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                        <CardContent className="pt-5 space-y-4">
                            <div className="space-y-1">
                                <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>Package Summary</p>
                                <p className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                                    {selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected
                                </p>
                                <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
                                    Timestamped at generation. Immutable once exported.
                                </p>
                            </div>

                            <Button
                                onClick={generate}
                                disabled={loading || !selectedSections.length}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackageOpen className="h-4 w-4 mr-2" />}
                                {loading ? 'Generating...' : 'Generate Package'}
                            </Button>

                            {packageData && (
                                <Button
                                    onClick={downloadJSON}
                                    variant="outline"
                                    className={cn("w-full", isDark ? "border-slate-700 text-slate-200" : "")}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Full Package (JSON)
                                </Button>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata */}
                    {packageData?.metadata && (
                        <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                            <CardContent className="pt-4 space-y-2">
                                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isDark ? "text-slate-400" : "text-slate-500")}>Package Provenance</p>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className={isDark ? "text-slate-500" : "text-slate-400"}>Generated</span>
                                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>{new Date(packageData.metadata.generated_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={isDark ? "text-slate-500" : "text-slate-400"}>By</span>
                                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>{packageData.metadata.generated_by}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Results Table */}
            {packageData && (
                <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                    <CardHeader className="pb-3">
                        <CardTitle className={cn("text-sm flex items-center gap-2", isDark ? "text-slate-200" : "text-slate-700")}>
                            <FileCheck className="h-4 w-4 text-teal-500" />
                            Evidence Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {SECTIONS.filter(s => counts[s.id] !== undefined).map(section => (
                                <div key={section.id} className={cn(
                                    "flex items-center justify-between p-3 rounded-lg",
                                    isDark ? "bg-slate-800" : "bg-slate-50"
                                )}>
                                    <div>
                                        <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-800")}>{section.label}</p>
                                        <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>{counts[section.id]} record{counts[section.id] !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn("text-xs", counts[section.id] > 0 ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-500")}>
                                            {counts[section.id] > 0 ? 'Included' : 'Empty'}
                                        </Badge>
                                        {counts[section.id] > 0 && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs"
                                                onClick={() => downloadCSV(section.id, section.label)}
                                            >
                                                <Download className="h-3 w-3 mr-1" />
                                                CSV
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}