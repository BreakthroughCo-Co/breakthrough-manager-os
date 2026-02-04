import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, AlertTriangle, TrendingUp, Users, Activity } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';

export default function PractitionerWellbeing() {
    const [wellbeingData, setWellbeingData] = useState(null);
    const { isDark } = useTheme();

    const wellbeingMutation = useMutation({
        mutationFn: () => base44.functions.invoke('monitorPractitionerWellbeing'),
        onSuccess: (response) => {
            setWellbeingData(response.data);
        }
    });

    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'critical': return 'border-l-red-500';
            case 'high': return 'border-l-amber-500';
            case 'moderate': return 'border-l-yellow-500';
            default: return 'border-l-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className={cn("text-3xl font-bold", isDark ? "text-slate-50" : "text-slate-900")}>
                    Practitioner Wellbeing Dashboard
                </h1>
                <p className={cn("mt-2", isDark ? "text-slate-400" : "text-slate-600")}>
                    Monitor workload, identify burnout risks, and support practitioner wellbeing
                </p>
            </div>

            <Button 
                onClick={() => wellbeingMutation.mutate()}
                disabled={wellbeingMutation.isPending}
                className={cn(
                    "transition-all",
                    isDark ? "bg-teal-600 hover:bg-teal-700" : "bg-teal-600 hover:bg-teal-700"
                )}
            >
                {wellbeingMutation.isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Wellbeing...
                    </>
                ) : (
                    <>
                        <Activity className="mr-2 h-4 w-4" />
                        Run Wellbeing Analysis
                    </>
                )}
            </Button>

            {wellbeingData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-white")}>
                            <CardHeader className="pb-3">
                                <CardTitle className={cn("text-sm font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                                    Total Practitioners
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", isDark ? "text-slate-50" : "text-slate-900")}>
                                    {wellbeingData.analysis.total_practitioners_analyzed}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-amber-50")}>
                            <CardHeader className="pb-3">
                                <CardTitle className={cn("text-sm font-medium", isDark ? "text-slate-400" : "text-amber-700")}>
                                    At Risk
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">
                                    {wellbeingData.analysis.at_risk_count}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-green-50")}>
                            <CardHeader className="pb-3">
                                <CardTitle className={cn("text-sm font-medium", isDark ? "text-slate-400" : "text-green-700")}>
                                    Healthy
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {wellbeingData.analysis.healthy_count}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Alert className={cn(isDark ? "bg-slate-900 border-slate-800" : "bg-blue-50 border-blue-200")}>
                        <Heart className="h-4 w-4" />
                        <AlertDescription className={isDark ? "text-slate-300" : "text-slate-700"}>
                            {wellbeingData.analysis.overall_wellbeing_summary}
                        </AlertDescription>
                    </Alert>

                    <Tabs defaultValue="at-risk" className="w-full">
                        <TabsList className={cn(
                            "grid w-full grid-cols-4",
                            isDark ? "bg-slate-800" : "bg-slate-100"
                        )}>
                            <TabsTrigger value="at-risk">At Risk</TabsTrigger>
                            <TabsTrigger value="workload">Workload</TabsTrigger>
                            <TabsTrigger value="recommendations">Actions</TabsTrigger>
                            <TabsTrigger value="insights">Insights</TabsTrigger>
                        </TabsList>

                        <TabsContent value="at-risk" className="space-y-4 mt-4">
                            {wellbeingData.analysis.at_risk_practitioners?.length === 0 ? (
                                <Alert className="bg-green-50 border-green-200">
                                    <AlertDescription className="text-green-800">
                                        No practitioners currently at risk of burnout.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                wellbeingData.analysis.at_risk_practitioners?.map((pract, idx) => (
                                    <Card key={idx} className={cn(
                                        "border-l-4",
                                        getRiskColor(pract.risk_level),
                                        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
                                    )}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle className={cn(isDark ? "text-slate-50" : "text-slate-900")}>
                                                    {pract.practitioner_name}
                                                </CardTitle>
                                                <Badge variant="destructive" className="capitalize">
                                                    {pract.risk_level} Risk
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h5 className={cn("font-semibold mb-2 text-sm", isDark ? "text-slate-50" : "text-slate-900")}>
                                                    Burnout Indicators:
                                                </h5>
                                                <ul className={cn("list-disc list-inside space-y-1 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                                                    {pract.burnout_indicators?.map((indicator, i) => (
                                                        <li key={i}>{indicator}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h5 className={cn("font-semibold mb-2 text-sm", isDark ? "text-slate-50" : "text-slate-900")}>
                                                    Stress Factors:
                                                </h5>
                                                <ul className={cn("list-disc list-inside space-y-1 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                                                    {pract.stress_factors?.map((factor, i) => (
                                                        <li key={i}>{factor}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className={cn(
                                                "p-3 rounded-lg",
                                                isDark ? "bg-slate-800" : "bg-amber-50"
                                            )}>
                                                <h5 className={cn("font-semibold mb-2 text-sm", isDark ? "text-slate-50" : "text-amber-900")}>
                                                    Immediate Actions Required:
                                                </h5>
                                                <ul className={cn("space-y-1 text-sm", isDark ? "text-slate-300" : "text-amber-800")}>
                                                    {pract.immediate_actions?.map((action, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                            {action}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h5 className={cn("font-semibold mb-2 text-sm", isDark ? "text-slate-50" : "text-slate-900")}>
                                                    Recommended Interventions:
                                                </h5>
                                                <ul className={cn("list-disc list-inside space-y-1 text-sm", isDark ? "text-slate-300" : "text-slate-600")}>
                                                    {pract.recommended_interventions?.map((intervention, i) => (
                                                        <li key={i}>{intervention}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="workload" className="space-y-6 mt-4">
                            <div>
                                <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                    Overutilized Practitioners
                                </h4>
                                <div className="space-y-2">
                                    {wellbeingData.analysis.workload_distribution?.overutilized?.map((pract, idx) => (
                                        <Card key={idx} className={cn(
                                            "border-l-4 border-l-red-500",
                                            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
                                        )}>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={cn("font-medium", isDark ? "text-slate-50" : "text-slate-900")}>
                                                            {pract.practitioner_name}
                                                        </p>
                                                        <ul className={cn("text-sm mt-2 space-y-1", isDark ? "text-slate-400" : "text-slate-600")}>
                                                            {pract.concerns?.map((concern, i) => (
                                                                <li key={i}>• {concern}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <Badge variant="destructive">
                                                        {pract.utilization_pct?.toFixed(0)}% Utilized
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                    Balanced Workload
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {wellbeingData.analysis.workload_distribution?.balanced?.map((pract, idx) => (
                                        <Card key={idx} className={cn(
                                            isDark ? "bg-slate-900 border-slate-800" : "bg-green-50"
                                        )}>
                                            <CardContent className="pt-4">
                                                <p className={cn("font-medium", isDark ? "text-slate-50" : "text-slate-900")}>
                                                    {pract.practitioner_name}
                                                </p>
                                                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-green-700")}>
                                                    {pract.utilization_pct?.toFixed(0)}% Utilized
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                    Underutilized Practitioners
                                </h4>
                                <div className="space-y-2">
                                    {wellbeingData.analysis.workload_distribution?.underutilized?.map((pract, idx) => (
                                        <Card key={idx} className={cn(
                                            "border-l-4 border-l-blue-500",
                                            isDark ? "bg-slate-900 border-slate-800" : "bg-white"
                                        )}>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={cn("font-medium", isDark ? "text-slate-50" : "text-slate-900")}>
                                                            {pract.practitioner_name}
                                                        </p>
                                                        <ul className={cn("text-sm mt-2 space-y-1", isDark ? "text-slate-400" : "text-slate-600")}>
                                                            {pract.opportunities?.map((opp, i) => (
                                                                <li key={i}>• {opp}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {pract.utilization_pct?.toFixed(0)}% Utilized
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="recommendations" className="space-y-4 mt-4">
                            <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                Workload Rebalancing Recommendations
                            </h4>
                            <div className="space-y-3">
                                {wellbeingData.analysis.rebalancing_recommendations?.map((rec, idx) => (
                                    <Card key={idx} className={cn(
                                        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
                                    )}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-start gap-3">
                                                <TrendingUp className="h-5 w-5 text-teal-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <Badge variant="outline" className="mb-2">
                                                        {rec.recommendation_type}
                                                    </Badge>
                                                    <p className={cn("text-sm mb-2", isDark ? "text-slate-300" : "text-slate-700")}>
                                                        {rec.description}
                                                    </p>
                                                    <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-500")}>
                                                        Expected Impact: {rec.expected_impact}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="mt-6">
                                <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                    Preventative Strategies
                                </h4>
                                <Card className={cn(
                                    isDark ? "bg-slate-900 border-slate-800" : "bg-teal-50"
                                )}>
                                    <CardContent className="pt-4">
                                        <ul className={cn("space-y-2", isDark ? "text-slate-300" : "text-teal-900")}>
                                            {wellbeingData.analysis.preventative_strategies?.map((strategy, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <Heart className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                                                    {strategy}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="insights" className="space-y-4 mt-4">
                            <h4 className={cn("font-semibold mb-3", isDark ? "text-slate-50" : "text-slate-900")}>
                                Systemic Wellbeing Insights
                            </h4>
                            <div className="space-y-3">
                                {wellbeingData.analysis.systemic_wellbeing_insights?.map((insight, idx) => (
                                    <Card key={idx} className={cn(
                                        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
                                    )}>
                                        <CardHeader>
                                            <CardTitle className={cn("text-base", isDark ? "text-slate-50" : "text-slate-900")}>
                                                {insight.pattern}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div>
                                                <p className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-slate-700")}>
                                                    Impact:
                                                </p>
                                                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-600")}>
                                                    {insight.impact}
                                                </p>
                                            </div>
                                            <div className={cn(
                                                "p-3 rounded-lg",
                                                isDark ? "bg-slate-800" : "bg-blue-50"
                                            )}>
                                                <p className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-blue-900")}>
                                                    Recommendation:
                                                </p>
                                                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-blue-800")}>
                                                    {insight.recommendation}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}