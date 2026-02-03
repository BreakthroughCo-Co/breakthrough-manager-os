import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, TrendingUp, AlertTriangle, Zap, Brain, BarChart3, 
  Sparkles, Loader2, RefreshCw 
} from 'lucide-react';

export default function AIAdminHub() {
  const [activeTab, setActiveTab] = useState('overview');

  // Training Needs
  const { data: trainingAnalysis, isLoading: trainingLoading, refetch: refetchTraining } = useQuery({
    queryKey: ['trainingNeeds'],
    queryFn: () => base44.functions.invoke('analyzeTrainingNeeds', {}),
    enabled: false
  });

  // Practitioner Performance
  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const { data: performanceAnalysis, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance', selectedPractitioner],
    queryFn: () => base44.functions.invoke('analyzePractitionerPerformance', {
      practitioner_id: selectedPractitioner
    }),
    enabled: !!selectedPractitioner
  });

  // Workload Optimization
  const { data: workloadAnalysis, isLoading: workloadLoading, refetch: refetchWorkload } = useQuery({
    queryKey: ['workload'],
    queryFn: () => base44.functions.invoke('optimizeCaseloads', {}),
    enabled: false
  });

  // Client Trends & Forecasting
  const { data: clientTrends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['clientTrends'],
    queryFn: () => base44.functions.invoke('predictClientTrends', {}),
    enabled: false
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Admin Hub</h1>
        <p className="text-muted-foreground mt-1">Centralized AI-driven insights for training, performance, workload, and business forecasting</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training Needs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="forecast">Business Forecast</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Practitioners</p>
                    <p className="text-2xl font-bold">{practitioners?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">AI Analyses Available</p>
                    <p className="text-2xl font-bold">4</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Action Items</p>
                    <p className="text-2xl font-bold">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Growth Opportunities</p>
                    <p className="text-2xl font-bold">View</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Run analyses to get AI-driven insights on training needs, practitioner performance, workload balance, and client growth/retention forecasting.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Training Needs Tab */}
        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Training Needs Analysis</h2>
            <Button 
              onClick={() => refetchTraining()} 
              disabled={trainingLoading}
              size="sm"
            >
              {trainingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run Analysis
            </Button>
          </div>

          {trainingLoading && (
            <Card>
              <CardContent className="pt-6 flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
                Analyzing training needs...
              </CardContent>
            </Card>
          )}

          {trainingAnalysis?.data && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{trainingAnalysis.data.analysis.individual_gaps?.length || 0} practitioners with identified training needs</p>
                </CardContent>
              </Card>

              {trainingAnalysis.data.analysis.individual_gaps?.map((pg, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{pg.practitioner_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium text-sm mb-2">Skill Gaps:</p>
                      <div className="space-y-1">
                        {pg.skill_gaps?.map((gap, gIdx) => (
                          <div key={gIdx} className="p-2 bg-amber-50 rounded text-sm border border-amber-200">
                            <p className="font-medium text-amber-900">{gap.gap}</p>
                            <p className="text-xs text-amber-800">{gap.evidence}</p>
                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${
                              gap.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {gap.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Recommended Training:</p>
                      <ul className="space-y-1">
                        {pg.recommended_training?.map((module, mIdx) => (
                          <li key={mIdx} className="text-sm text-slate-600 flex items-center gap-2">
                            <span className="text-teal-600">→</span> {module}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-4">Practitioner Performance Insights</h2>
            
            <div className="mb-4">
              <label className="text-sm font-medium">Select Practitioner</label>
              <select 
                value={selectedPractitioner || ''}
                onChange={(e) => setSelectedPractitioner(e.target.value || null)}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="">-- Choose practitioner --</option>
                {practitioners?.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            {performanceLoading && (
              <Card>
                <CardContent className="pt-6 flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
                  Analyzing performance...
                </CardContent>
              </Card>
            )}

            {performanceAnalysis?.data && (
              <div className="space-y-4">
                <Card className={`border-l-4 ${
                  performanceAnalysis.data.performance_insights.performance_rating === 'exceeds' ? 'border-l-emerald-500' :
                  performanceAnalysis.data.performance_insights.performance_rating === 'meets' ? 'border-l-blue-500' :
                  'border-l-amber-500'
                }`}>
                  <CardHeader>
                    <CardTitle>Performance Rating: {performanceAnalysis.data.performance_insights.performance_rating?.toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{performanceAnalysis.data.performance_insights.summary}</p>
                    
                    <div>
                      <p className="font-medium text-sm mb-2">Strengths:</p>
                      <ul className="space-y-1">
                        {performanceAnalysis.data.performance_insights.strengths?.map((s, idx) => (
                          <li key={idx} className="text-sm text-emerald-700 flex items-center gap-2">
                            <span>✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {performanceAnalysis.data.performance_insights.development_areas?.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">Areas for Development:</p>
                        <ul className="space-y-1">
                          {performanceAnalysis.data.performance_insights.development_areas?.map((area, idx) => (
                            <li key={idx} className="text-sm text-amber-700 flex items-center gap-2">
                              <span>→</span> {area.area}: {area.evidence}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {performanceAnalysis.data.performance_insights.development_path?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommended Development Path</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {performanceAnalysis.data.performance_insights.development_path?.map((step, idx) => (
                        <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="font-medium text-sm">{step.recommendation}</p>
                          <p className="text-xs text-slate-600">Timeframe: {step.timeframe}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Business Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Client Growth & Retention Forecast</h2>
            <Button 
              onClick={() => refetchTrends()} 
              disabled={trendsLoading}
              size="sm"
            >
              {trendsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run Forecast
            </Button>
          </div>

          {trendsLoading && (
            <Card>
              <CardContent className="pt-6 flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
                Forecasting client trends...
              </CardContent>
            </Card>
          )}

          {clientTrends?.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">High Engagement</p>
                    <p className="text-2xl font-bold">{clientTrends.data.key_metrics.high_engagement}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Medium Engagement</p>
                    <p className="text-2xl font-bold">{clientTrends.data.key_metrics.medium_engagement}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Low Engagement</p>
                    <p className="text-2xl font-bold text-amber-600">{clientTrends.data.key_metrics.low_engagement}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Plan Renewals (90d)</p>
                    <p className="text-2xl font-bold">{clientTrends.data.key_metrics.approaching_plan_renewal}</p>
                  </CardContent>
                </Card>
              </div>

              {clientTrends.data.forecast_analysis.attrition_risk?.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-900">⚠️ Attrition Risk - High Priority</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {clientTrends.data.forecast_analysis.attrition_risk?.slice(0, 5).map((client, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-red-200">
                        <p className="font-medium text-sm">{client.client_name}</p>
                        <p className="text-xs text-slate-600">{client.risk_indicators?.join(', ')}</p>
                        <p className="text-xs text-red-700 mt-1"><strong>Action:</strong> {client.retention_strategy}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {clientTrends.data.forecast_analysis.growth_opportunities?.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-emerald-900">💡 Growth Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {clientTrends.data.forecast_analysis.growth_opportunities?.slice(0, 5).map((opp, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-emerald-200">
                        <p className="font-medium text-sm">{opp.client_name}</p>
                        <p className="text-xs text-slate-600">Current: {opp.current_service}</p>
                        <p className="text-xs text-emerald-700"><strong>Expand to:</strong> {opp.recommended_expansion}</p>
                        <p className="text-xs text-slate-600">Revenue Potential: {opp.revenue_potential}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {clientTrends.data.forecast_analysis.business_forecast && (
                <Card>
                  <CardHeader>
                    <CardTitle>12-Month Business Forecast</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Predicted Retention Rate</p>
                      <p className="text-slate-700">{clientTrends.data.forecast_analysis.business_forecast.predicted_retention_rate}</p>
                    </div>
                    <div>
                      <p className="font-medium">Revenue Impact</p>
                      <p className="text-slate-700">{clientTrends.data.forecast_analysis.business_forecast.expected_revenue_impact}</p>
                    </div>
                    <div>
                      <p className="font-medium">Growth Potential</p>
                      <p className="text-slate-700">{clientTrends.data.forecast_analysis.business_forecast.growth_potential}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}