import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RiskManagement() {
  const [riskData, setRiskData] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['systemicRisks'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeSystemicRisks');
      return response.data;
    },
    enabled: false
  });

  const handleAnalyze = async () => {
    const result = await refetch();
    if (result.data?.success) {
      setRiskData(result.data.risk_analysis);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            Systemic Risk Management
          </h1>
          <p className="text-slate-600 mt-1">
            AI-driven organizational risk identification and mitigation
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Run Risk Analysis'}
        </Button>
      </div>

      {!riskData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Click "Run Risk Analysis" to identify systemic risks</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="matrix">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
            <TabsTrigger value="emerging">Emerging Patterns</TabsTrigger>
            <TabsTrigger value="root">Root Causes</TabsTrigger>
            <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskData.risk_matrix?.map((risk, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{risk.risk_category}</h3>
                        <Badge className={
                          risk.risk_score >= 15 ? 'bg-red-600' :
                          risk.risk_score >= 9 ? 'bg-orange-600' :
                          'bg-amber-600'
                        }>
                          Risk Score: {risk.risk_score}
                        </Badge>
                      </div>
                      <div className="text-right text-xs">
                        <p><strong>Likelihood:</strong> {risk.likelihood}</p>
                        <p><strong>Impact:</strong> {risk.impact}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{risk.risk_description}</p>
                    <p className="text-xs text-blue-700"><strong>Status:</strong> {risk.current_status}</p>
                    {risk.affected_domains?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {risk.affected_domains.map((domain, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{domain}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="emerging" className="space-y-4">
            {riskData.emerging_patterns?.map((pattern, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{pattern.pattern}</h3>
                      <p className="text-sm text-slate-700 mb-2">{pattern.evidence}</p>
                      <Badge variant="outline">{pattern.trajectory}</Badge>
                      {pattern.early_warning_signs?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-1">Early Warning Signs:</p>
                          <ul className="text-xs space-y-1">
                            {pattern.early_warning_signs.map((sign, i) => (
                              <li key={i}>• {sign}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="root" className="space-y-4">
            {riskData.root_causes?.map((cause, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{cause.root_cause}</h3>
                  <Badge className="mb-3">{cause.remediation_complexity} complexity</Badge>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">Contributing Factors:</p>
                      <ul className="ml-4 text-slate-700">
                        {cause.contributing_factors?.map((factor, i) => (
                          <li key={i}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Affected Processes:</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {cause.affected_processes?.map((proc, i) => (
                          <Badge key={i} variant="outline">{proc}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mitigation" className="space-y-4">
            {riskData.mitigation_strategies?.map((strategy, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{strategy.strategy}</h3>
                    <Badge className={
                      strategy.priority === 'critical' ? 'bg-red-600' :
                      strategy.priority === 'high' ? 'bg-orange-600' :
                      'bg-amber-600'
                    }>
                      {strategy.priority}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Implementation Steps:</p>
                      <ol className="ml-4 list-decimal text-slate-700">
                        {strategy.implementation_steps?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium">Resources:</p>
                        <p className="text-slate-700">{strategy.resources_required}</p>
                      </div>
                      <div>
                        <p className="font-medium">Timeline:</p>
                        <p className="text-slate-700">{strategy.implementation_timeline}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs"><strong>Expected Outcome:</strong> {strategy.expected_outcome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskData.monitoring_indicators?.map((indicator, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">{indicator.indicator}</h3>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-medium">{indicator.current_value}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target:</span>
                            <span className="font-medium text-green-700">{indicator.target_value}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Frequency:</span>
                            <span>{indicator.monitoring_frequency}</span>
                          </div>
                          <div className="p-2 bg-red-50 rounded mt-2">
                            <strong>Escalation:</strong> {indicator.escalation_threshold}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}