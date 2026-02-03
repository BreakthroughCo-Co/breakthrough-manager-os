import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Sparkles,
    DollarSign,
    Copy,
    BarChart3,
    AlertCircle,
    RefreshCw,
    Check,
    X
} from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BillingAIInsights() {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const queryClient = useQueryClient();

    const applyFixMutation = useMutation({
        mutationFn: ({ recordId, updates }) => base44.entities.BillingRecord.update(recordId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing'] });
            toast.success('Record updated successfully');
            runAnalysis(); // Refresh analysis
        },
        onError: (err) => {
            toast.error('Failed to update record: ' + err.message);
        }
    });

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await base44.functions.invoke('optimizeBillingClaims', {});
            setAnalysis(response.data.analysis);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const severityColors = {
        high: 'bg-red-100 text-red-800 border-red-300',
        medium: 'bg-amber-100 text-amber-800 border-amber-300',
        low: 'bg-blue-100 text-blue-800 border-blue-300'
    };

    if (!analysis && !loading) {
        return (
            <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Billing Optimization</h3>
                        <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                            Analyze billing records to detect errors, suggest optimal line items, identify duplicates, and forecast revenue.
                        </p>
                        <Button onClick={runAnalysis} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Run AI Analysis
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <RefreshCw className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                        <p className="text-slate-600">Analyzing billing records...</p>
                        <p className="text-sm text-slate-500 mt-2">This may take a moment</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                    {error}
                    <Button variant="outline" size="sm" onClick={runAnalysis} className="ml-4">
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-slate-900">AI Billing Analysis</h3>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {analysis.insights?.total_records_analyzed || 0} records analyzed
                    </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Revenue Forecast */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                        <TrendingUp className="w-5 h-5" />
                        Revenue Forecast
                    </CardTitle>
                    <CardDescription>AI-predicted revenue for next 3 months</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <p className="text-sm text-slate-600 mb-1">Next Month</p>
                            <p className="text-2xl font-bold text-purple-900">
                                ${(analysis.revenue_forecast?.next_month || 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <p className="text-sm text-slate-600 mb-1">Month 2</p>
                            <p className="text-2xl font-bold text-purple-900">
                                ${(analysis.revenue_forecast?.month_2 || 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <p className="text-sm text-slate-600 mb-1">Month 3</p>
                            <p className="text-2xl font-bold text-purple-900">
                                ${(analysis.revenue_forecast?.month_3 || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-800">
                                {analysis.revenue_forecast?.trend}
                            </Badge>
                            <Badge variant="outline">
                                {analysis.revenue_forecast?.confidence} confidence
                            </Badge>
                        </div>
                        {analysis.revenue_forecast?.factors && (
                            <div className="mt-3">
                                <p className="text-sm font-medium text-slate-700 mb-2">Key Factors:</p>
                                <ul className="space-y-1">
                                    {analysis.revenue_forecast.factors.map((factor, idx) => (
                                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                            <span className="text-purple-600">•</span>
                                            {factor}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Detected Errors */}
            {analysis.detected_errors && analysis.detected_errors.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-900">
                            <AlertTriangle className="w-5 h-5" />
                            Detected Errors ({analysis.detected_errors.length})
                        </CardTitle>
                        <CardDescription>Issues requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analysis.detected_errors.map((error, idx) => (
                                <div key={idx} className={cn("p-4 rounded-lg border", severityColors[error.severity] || severityColors.low)}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold">{error.client_name}</p>
                                            <Badge variant="outline" className="mt-1 text-xs">
                                                {error.error_type}
                                            </Badge>
                                        </div>
                                        <Badge className={error.severity === 'high' ? 'bg-red-600' : error.severity === 'medium' ? 'bg-amber-600' : 'bg-blue-600'}>
                                            {error.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm mb-2">{error.description}</p>
                                    <div className="bg-white/50 rounded p-2 mt-2">
                                        <p className="text-xs font-medium mb-1">Suggested Fix:</p>
                                        <p className="text-sm mb-2">{error.suggested_fix}</p>
                                        {error.record_id && (
                                            <div className="flex gap-2 mt-3">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const updates = {};
                                                        if (error.error_type === 'Line Item Mismatch' && error.suggested_fix.includes('line item')) {
                                                            const lineItemMatch = error.suggested_fix.match(/\d{2}_\d{3}_\d{4}_\d_\d/);
                                                            if (lineItemMatch) updates.ndis_line_item = lineItemMatch[0];
                                                        }
                                                        if (Object.keys(updates).length > 0) {
                                                            applyFixMutation.mutate({ recordId: error.record_id, updates });
                                                        }
                                                    }}
                                                    disabled={applyFixMutation.isPending}
                                                    className="bg-green-600 hover:bg-green-700 text-xs"
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Apply Fix
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        toast.info('Error dismissed');
                                                        runAnalysis();
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Dismiss
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Duplicate Entries */}
            {analysis.duplicate_entries && analysis.duplicate_entries.length > 0 && (
                <Card className="border-amber-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <Copy className="w-5 h-5" />
                            Potential Duplicates ({analysis.duplicate_entries.length})
                        </CardTitle>
                        <CardDescription>Review these entries for possible duplicates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analysis.duplicate_entries.map((dup, idx) => (
                                <div key={idx} className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-amber-900">{dup.client_name}</p>
                                            <p className="text-sm text-amber-700">{dup.service_type} - {dup.service_date}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                            {dup.record_ids?.length || 0} records
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-amber-800">{dup.reason}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Line Item Suggestions */}
            {analysis.line_item_suggestions && analysis.line_item_suggestions.length > 0 && (
                <Card className="border-blue-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <CheckCircle className="w-5 h-5" />
                            Line Item Optimization ({analysis.line_item_suggestions.length})
                        </CardTitle>
                        <CardDescription>Suggested improvements for NDIS line items</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analysis.line_item_suggestions.map((suggestion, idx) => (
                                <div key={idx} className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                                    <div className="mb-2">
                                        <p className="font-semibold text-blue-900">{suggestion.service_type}</p>
                                        <div className="flex items-center gap-2 mt-1 text-sm">
                                            <Badge variant="outline" className="bg-slate-100">
                                                Current: {suggestion.current_line_item || 'None'}
                                            </Badge>
                                            <span className="text-blue-600">→</span>
                                            <Badge className="bg-blue-600">
                                                Suggested: {suggestion.suggested_line_item}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-blue-800 mb-2">{suggestion.rationale}</p>
                                    <div className="bg-white/50 rounded p-2">
                                        <p className="text-xs font-medium text-blue-900">Impact: {suggestion.impact}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Key Insights */}
            {analysis.insights && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-teal-600" />
                            Key Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-slate-50 rounded-lg p-3 border">
                                <p className="text-xs text-slate-600 mb-1">Total Revenue</p>
                                <p className="text-lg font-bold text-slate-900">
                                    ${(analysis.insights.total_revenue || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border">
                                <p className="text-xs text-slate-600 mb-1">Avg Rate</p>
                                <p className="text-lg font-bold text-slate-900">
                                    ${(analysis.insights.average_rate || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border">
                                <p className="text-xs text-slate-600 mb-1">Most Common</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {analysis.insights.most_common_service}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border">
                                <p className="text-xs text-slate-600 mb-1">Compliance Score</p>
                                <p className="text-lg font-bold text-teal-600">
                                    {analysis.insights.compliance_score || 0}%
                                </p>
                            </div>
                        </div>

                        {analysis.insights.key_recommendations && (
                            <div className="mb-4">
                                <p className="text-sm font-semibold text-slate-900 mb-2">Recommendations:</p>
                                <ul className="space-y-1">
                                    {analysis.insights.key_recommendations.map((rec, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis.insights.risk_areas && analysis.insights.risk_areas.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-slate-900 mb-2">Risk Areas:</p>
                                <ul className="space-y-1">
                                    {analysis.insights.risk_areas.map((risk, idx) => (
                                        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                            {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}