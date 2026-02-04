import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, AlertCircle, Users, Award, Target } from "lucide-react";

export default function ClientJourneyAnalyticsPage() {
    const [analysisData, setAnalysisData] = useState(null);

    const analysisMutation = useMutation({
        mutationFn: () => base44.functions.invoke('analyzeClientJourneys', {}),
        onSuccess: (response) => setAnalysisData(response.data)
    });

    const riskColors = {
        critical: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        medium: "bg-yellow-100 text-yellow-800",
        low: "bg-blue-100 text-blue-800"
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Client Journey Analytics</h1>
                <p className="text-gray-600">AI-powered insights into client pathways and outcomes</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generate Journey Analysis</CardTitle>
                    <CardDescription>Analyze client progression patterns, predict outcomes, and identify risks</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                        onClick={() => analysisMutation.mutate()}
                        disabled={analysisMutation.isPending}
                    >
                        {analysisMutation.isPending ? 'Analyzing...' : 'Run Journey Analysis'}
                    </Button>
                </CardContent>
            </Card>

            {analysisData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Total Clients Analyzed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analysisData.dataset_summary.total_clients}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Active Clients</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analysisData.dataset_summary.active_clients}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Case Notes Analyzed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analysisData.dataset_summary.total_case_notes}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysisData.analysis.analysis_summary}</p>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="pathways" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="pathways">Common Pathways</TabsTrigger>
                            <TabsTrigger value="success">Success Factors</TabsTrigger>
                            <TabsTrigger value="risk">At-Risk Clients</TabsTrigger>
                            <TabsTrigger value="effectiveness">Service Effectiveness</TabsTrigger>
                            <TabsTrigger value="predictions">Outcome Predictions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pathways">
                            <div className="space-y-4">
                                {analysisData.analysis.common_pathways?.map((pathway, idx) => (
                                    <Card key={idx}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg">{pathway.pathway_name}</CardTitle>
                                                <Badge><Users className="h-3 w-3 mr-1 inline" />{pathway.client_count} clients</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Duration</p>
                                                        <p className="font-medium">{pathway.typical_duration_days} days</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Success Rate</p>
                                                        <p className="font-medium text-green-700">{pathway.success_rate}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold mb-2">Common Milestones:</p>
                                                    <ul className="space-y-1">
                                                        {pathway.common_milestones?.map((milestone, midx) => (
                                                            <li key={midx} className="text-sm flex items-center gap-2">
                                                                <span className="text-blue-600">→</span>
                                                                {milestone}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="success">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="h-5 w-5 text-green-600" />
                                        Success Factors
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {analysisData.analysis.success_factors?.map((factor, idx) => (
                                            <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className="bg-green-100 text-green-800">{factor.impact_level} impact</Badge>
                                                    <span className="font-medium">{factor.factor}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{factor.evidence}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="risk">
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Disengagement Risk Indicators</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {analysisData.analysis.disengagement_risk_indicators?.map((indicator, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                                    <span className="text-sm">{indicator.indicator}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={riskColors[indicator.risk_level?.toLowerCase()] || riskColors.medium}>
                                                            {indicator.risk_level}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">{indicator.prevalence}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-orange-600" />
                                            At-Risk Clients
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {analysisData.analysis.at_risk_clients?.map((client, idx) => (
                                                <div key={idx} className="p-3 border-l-4 border-orange-500 rounded">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">{client.client_name}</span>
                                                        <Badge className="bg-orange-100 text-orange-800">
                                                            Risk Score: {client.risk_score}
                                                        </Badge>
                                                    </div>
                                                    <div className="mb-2">
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">Risk Factors:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {client.risk_factors?.map((factor, fidx) => (
                                                                <Badge key={fidx} variant="outline" className="text-xs">{factor}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-600">Recommended Intervention:</p>
                                                        <p className="text-sm text-gray-700">{client.recommended_intervention}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="effectiveness">
                            <div className="space-y-4">
                                {analysisData.analysis.service_effectiveness?.map((service, idx) => (
                                    <Card key={idx}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle>{service.service_type}</CardTitle>
                                                <Badge className="bg-blue-100 text-blue-800">{service.effectiveness_rating}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm font-semibold mb-1">Key Metrics:</p>
                                                    <p className="text-sm text-gray-700">{service.key_metrics}</p>
                                                </div>
                                                {service.improvement_areas && service.improvement_areas.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-semibold mb-1">Improvement Areas:</p>
                                                        <ul className="space-y-1">
                                                            {service.improvement_areas.map((area, aidx) => (
                                                                <li key={aidx} className="text-sm flex items-start gap-2">
                                                                    <Target className="h-3 w-3 mt-0.5 text-gray-400" />
                                                                    {area}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="predictions">
                            <div className="space-y-3">
                                {analysisData.analysis.outcome_predictions?.map((pred, idx) => (
                                    <Card key={idx}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium mb-1">{pred.client_name}</p>
                                                    <p className="text-sm text-gray-700 mb-2">{pred.predicted_outcome}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {pred.key_factors?.map((factor, fidx) => (
                                                            <Badge key={fidx} variant="outline" className="text-xs">{factor}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Badge className="bg-blue-100 text-blue-800 whitespace-nowrap">
                                                    {pred.confidence} confidence
                                                </Badge>
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