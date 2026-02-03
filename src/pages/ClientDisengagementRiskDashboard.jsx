import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingDown, MessageCircle, Calendar, Zap, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DisengagementRiskChart from '@/components/client/DisengagementRiskChart';
import InterventionRecommendationsPanel from '@/components/client/InterventionRecommendationsPanel';

export default function ClientDisengagementRiskDashboard() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState('all');

  // Analyze disengagement risk
  const { data: riskAnalysis, isLoading: riskLoading, refetch: refetchRisk } = useQuery({
    queryKey: ['clientDisengagementRisk'],
    queryFn: async () => {
      const res = await base44.functions.invoke('analyzeClientDisengagementRisk', {});
      return res.data;
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  // Get intervention suggestions for selected client
  const { data: interventions, isLoading: interventionsLoading } = useQuery({
    queryKey: ['clientInterventions', selectedClient?.client_id],
    queryFn: async () => {
      if (!selectedClient) return null;
      const res = await base44.functions.invoke('suggestPersonalizedInterventions', {
        client_ids: [selectedClient.client_id]
      });
      return res.data.interventions?.[0] || null;
    },
    enabled: !!selectedClient,
    staleTime: 1000 * 60 * 30 // 30 minutes
  });

  // Filter clients based on selected risk level
  const filteredClients = riskAnalysis
    ? filterRiskLevel === 'all'
      ? riskAnalysis.all_analyses
      : riskAnalysis[`${filterRiskLevel}_risk_clients`] || []
    : [];

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getRiskBadge = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge className="bg-red-600">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-600">High Risk</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-600">Moderate</Badge>;
      default:
        return <Badge className="bg-green-600">Low Risk</Badge>;
    }
  };

  if (riskLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Client Disengagement Risk Monitor</h1>
        <p className="text-slate-600 mt-2">
          Proactive identification of clients at risk of disengagement with personalized intervention strategies.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskAnalysis?.total_clients_analyzed || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Critical Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{riskAnalysis?.critical_risk_count || 0}</div>
            <p className="text-xs text-red-600 mt-1">Immediate attention needed</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{riskAnalysis?.high_risk_count || 0}</div>
            <p className="text-xs text-orange-600 mt-1">Intervention recommended</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">Moderate Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{riskAnalysis?.moderate_risk_count || 0}</div>
            <p className="text-xs text-yellow-600 mt-1">Monitor closely</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {riskAnalysis?.critical_risk_clients?.length > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>{riskAnalysis.critical_risk_clients.length} clients require immediate intervention.</strong> These clients show critical disengagement risk indicators.
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Disengagement Risk Distribution</CardTitle>
          <CardDescription>Visual overview of client risk levels</CardDescription>
        </CardHeader>
        <CardContent>
          <DisengagementRiskChart analyses={riskAnalysis?.all_analyses || []} />
        </CardContent>
      </Card>

      {/* Client List and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Client Risk Assessment</CardTitle>
          <CardDescription>
            Filter by risk level to view detailed engagement metrics and intervention opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="critical" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="critical">
                Critical ({riskAnalysis?.critical_risk_count || 0})
              </TabsTrigger>
              <TabsTrigger value="high">
                High ({riskAnalysis?.high_risk_count || 0})
              </TabsTrigger>
              <TabsTrigger value="moderate">
                Moderate ({riskAnalysis?.moderate_risk_count || 0})
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {['critical', 'high', 'moderate', 'all'].map(level => (
              <TabsContent key={level} value={level} className="space-y-3 mt-4">
                {(level === 'critical'
                  ? riskAnalysis?.critical_risk_clients || []
                  : level === 'high'
                  ? riskAnalysis?.high_risk_clients || []
                  : level === 'moderate'
                  ? riskAnalysis?.moderate_risk_clients || []
                  : riskAnalysis?.all_analyses || []
                ).map(client => (
                  <div
                    key={client.client_id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${getRiskColor(client.risk_level)} ${
                      selectedClient?.client_id === client.client_id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-900">{client.client_name}</h3>
                          {getRiskBadge(client.risk_level)}
                          <span className="text-2xl font-bold text-slate-700">{client.disengagement_risk_score}</span>
                          <span className="text-xs text-slate-500">/100</span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Calendar className="h-4 w-4" />
                              Sessions (30d)
                            </div>
                            <div className="font-semibold">{client.sessions_last_30d}</div>
                            <div className={`text-xs ${client.session_trend === 'declining' ? 'text-red-600' : client.session_trend === 'improving' ? 'text-green-600' : 'text-slate-500'}`}>
                              {client.session_trend}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <MessageCircle className="h-4 w-4" />
                              Response Rate
                            </div>
                            <div className="font-semibold">{client.response_rate_percent}%</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <TrendingDown className="h-4 w-4" />
                              Progress
                            </div>
                            <div className="font-semibold">{client.average_recent_progress.toFixed(1)}/5</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Zap className="h-4 w-4" />
                              Goal Momentum
                            </div>
                            <div className="font-semibold">{client.goal_momentum_score}%</div>
                          </div>
                        </div>

                        {client.primary_risk_factors?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {client.primary_risk_factors.slice(0, 3).map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Intervention Recommendations */}
      {selectedClient && (
        <InterventionRecommendationsPanel
          client={selectedClient}
          interventions={interventions}
          isLoading={interventionsLoading}
        />
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={() => refetchRisk()} variant="outline">
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}