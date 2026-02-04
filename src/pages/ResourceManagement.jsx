import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, CheckCircle } from "lucide-react";

export default function ResourceManagementPage() {
    const [forecastData, setForecastData] = useState(null);
    const [schedulingData, setSchedulingData] = useState(null);

    const forecastMutation = useMutation({
        mutationFn: () => base44.functions.invoke('forecastResourceDemand', { forecast_period_months: 3 }),
        onSuccess: (response) => setForecastData(response.data)
    });

    const schedulingMutation = useMutation({
        mutationFn: () => base44.functions.invoke('optimizePractitionerScheduling', { optimization_period_weeks: 4 }),
        onSuccess: (response) => setSchedulingData(response.data)
    });

    const severityColors = {
        critical: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        medium: "bg-yellow-100 text-yellow-800",
        low: "bg-blue-100 text-blue-800"
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Predictive Resource Management</h1>
                <p className="text-gray-600">AI-powered demand forecasting and workforce optimization</p>
            </div>

            <Tabs defaultValue="forecast" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
                    <TabsTrigger value="scheduling">Scheduling Optimization</TabsTrigger>
                </TabsList>

                <TabsContent value="forecast" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Demand Forecast</CardTitle>
                            <CardDescription>Predict service demand and resource requirements</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={() => forecastMutation.mutate()}
                                disabled={forecastMutation.isPending}
                            >
                                {forecastMutation.isPending ? 'Analyzing...' : 'Run Forecast Analysis'}
                            </Button>
                        </CardContent>
                    </Card>

                    {forecastData && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Active Clients</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{forecastData.current_state.active_clients}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Active Practitioners</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{forecastData.current_state.active_practitioners}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Utilization Rate</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{forecastData.current_state.utilization_rate.toFixed(1)}%</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Pending Intakes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{forecastData.current_state.pending_intakes}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Forecast Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{forecastData.forecast.forecast_summary}</p>
                                </CardContent>
                            </Card>

                            {forecastData.forecast.forecasted_demand && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Demand by Service Type</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {forecastData.forecast.forecasted_demand.map((demand, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{demand.service_type}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Current: {demand.current_monthly_volume}/mo → 
                                                            Forecast: {demand.forecasted_monthly_volume}/mo
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge className={demand.growth_rate > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                            {demand.growth_rate > 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                                                            {demand.growth_rate > 0 ? '+' : ''}{demand.growth_rate}%
                                                        </Badge>
                                                        <p className="text-xs text-gray-500 mt-1">{demand.confidence} confidence</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {forecastData.forecast.resource_gaps && forecastData.forecast.resource_gaps.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                                            Resource Gaps
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {forecastData.forecast.resource_gaps.map((gap, idx) => (
                                                <div key={idx} className="border-l-4 border-orange-500 pl-4 py-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={severityColors[gap.gap_severity.toLowerCase()] || severityColors.medium}>
                                                            {gap.gap_severity}
                                                        </Badge>
                                                        <span className="font-medium">{gap.resource_type}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{gap.projected_shortage}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Timeline: {gap.timeline}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {forecastData.forecast.hiring_recommendations && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Hiring Recommendations</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {forecastData.forecast.hiring_recommendations.map((rec, idx) => (
                                                <div key={idx} className="p-3 border rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-gray-500" />
                                                            <span className="font-medium">{rec.role}</span>
                                                            <Badge>x{rec.quantity}</Badge>
                                                        </div>
                                                        <Badge className={severityColors[rec.urgency.toLowerCase()] || severityColors.medium}>
                                                            {rec.urgency}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{rec.rationale}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="scheduling" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Optimize Practitioner Scheduling</CardTitle>
                            <CardDescription>Rebalance workloads and maximize efficiency</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={() => schedulingMutation.mutate()}
                                disabled={schedulingMutation.isPending}
                            >
                                {schedulingMutation.isPending ? 'Optimizing...' : 'Run Scheduling Analysis'}
                            </Button>
                        </CardContent>
                    </Card>

                    {schedulingData && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Optimization Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedulingData.optimization.optimization_summary}</p>
                                </CardContent>
                            </Card>

                            {schedulingData.optimization.workload_analysis && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm text-red-700">Overutilized</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-red-700">
                                                {schedulingData.optimization.workload_analysis.overutilized_practitioners?.length || 0}
                                            </div>
                                            <ul className="mt-2 text-xs space-y-1">
                                                {schedulingData.optimization.workload_analysis.overutilized_practitioners?.map((p, idx) => (
                                                    <li key={idx}>{p}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm text-green-700">Balanced</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-700">
                                                {schedulingData.optimization.workload_analysis.balanced_practitioners?.length || 0}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm text-blue-700">Underutilized</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-blue-700">
                                                {schedulingData.optimization.workload_analysis.underutilized_practitioners?.length || 0}
                                            </div>
                                            <ul className="mt-2 text-xs space-y-1">
                                                {schedulingData.optimization.workload_analysis.underutilized_practitioners?.map((p, idx) => (
                                                    <li key={idx}>{p}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {schedulingData.optimization.rebalancing_recommendations && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Rebalancing Recommendations</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {schedulingData.optimization.rebalancing_recommendations.map((rec, idx) => (
                                                <div key={idx} className="p-3 border rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">{rec.practitioner_name}</span>
                                                        <Badge>{rec.current_utilization}% utilized</Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mb-1">{rec.recommended_action}</p>
                                                    <p className="text-xs text-gray-500">Impact: {rec.expected_impact}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}