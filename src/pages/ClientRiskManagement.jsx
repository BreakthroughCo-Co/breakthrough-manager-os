import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClientRiskWidget from '@/components/dashboard/ClientRiskWidget';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientRiskManagement() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch active clients
  const { data: clients } = useQuery({
    queryKey: ['clients_active'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active').sort((a, b) => a.full_name.localeCompare(b.full_name)) || [];
    }
  });

  // Fetch all risk profiles
  const { data: riskProfiles, refetch } = useQuery({
    queryKey: ['riskProfiles'],
    queryFn: async () => {
      const data = await base44.entities.ClientRiskProfile.list();
      return data?.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return riskOrder[a.overall_risk_level] - riskOrder[b.overall_risk_level];
      }) || [];
    }
  });

  const handleAnalyzeRisk = async (clientId) => {
    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeClientRisk', {
        client_id: clientId
      });
      refetch();
      setSelectedClientId(clientId);
    } catch (err) {
      alert('Error analyzing risk: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);
  const selectedRiskProfile = riskProfiles?.find(r => r.client_id === selectedClientId);

  const riskBadgeColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-yellow-600',
    low: 'bg-green-600'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Client Risk Management</h1>
        <p className="text-slate-600 mt-2">AI-driven risk profiling and monitoring</p>
      </div>

      {/* Overview Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI analyzes client data (engagement, incidents, goals, motivation) to predict disengagement, crisis, compliance, and plan adherence risks. Use this for proactive intervention planning.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-4">
        {/* Risk Summary Cards */}
        {riskProfiles && [
          { level: 'critical', label: 'Critical Risk', color: 'bg-red-100 border-red-300' },
          { level: 'high', label: 'High Risk', color: 'bg-orange-100 border-orange-300' },
          { level: 'medium', label: 'Medium Risk', color: 'bg-yellow-100 border-yellow-300' }
        ].map(({ level, label, color }) => {
          const count = riskProfiles.filter(p => p.overall_risk_level === level).length;
          return (
            <Card key={level} className={`border ${color}`}>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600 mb-1">{label}</p>
                <p className="text-3xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-600 mt-2">clients monitored</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client for Analysis</CardTitle>
          <CardDescription>Choose a client to view or generate risk profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Search clients..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClientId && (
            <Button
              onClick={() => handleAnalyzeRisk(selectedClientId)}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Risk'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Risk Profile Display */}
      {selectedClientId && (
        <div className="space-y-4">
          <ClientRiskWidget clientId={selectedClientId} />

          {selectedRiskProfile && (
            <>
              {/* Detailed Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Risk Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contributing Factors */}
                  {selectedRiskProfile.contributing_factors && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Contributing Factors</h4>
                      <p className="text-sm text-slate-700">{selectedRiskProfile.contributing_factors}</p>
                    </div>
                  )}

                  {/* Risk Indicators */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRiskProfile.disengagement_indicators?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-blue-900">Disengagement Indicators</h4>
                        <ul className="text-xs space-y-1">
                          {selectedRiskProfile.disengagement_indicators.map((ind, idx) => (
                            <li key={idx} className="text-slate-700">• {ind}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRiskProfile.crisis_indicators?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-red-900">Crisis Indicators</h4>
                        <ul className="text-xs space-y-1">
                          {selectedRiskProfile.crisis_indicators.map((ind, idx) => (
                            <li key={idx} className="text-slate-700">• {ind}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Compliance Risk */}
                  {selectedRiskProfile.compliance_risk_factors?.length > 0 && (
                    <div className="bg-amber-50 rounded p-3 border border-amber-200">
                      <h4 className="font-semibold text-sm mb-2 text-amber-900">Compliance Risk Factors</h4>
                      <ul className="text-xs space-y-1">
                        {selectedRiskProfile.compliance_risk_factors.map((factor, idx) => (
                          <li key={idx} className="text-amber-800">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              {selectedRiskProfile.recommended_actions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      {selectedRiskProfile.recommended_actions.map((action, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="font-bold text-blue-600">{idx + 1}.</span>
                          <span className="text-slate-700">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Risk Profile History */}
      {riskProfiles && riskProfiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Client Risk Profiles</CardTitle>
            <CardDescription>Latest analysis for each client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {riskProfiles.slice(0, 20).map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedClientId(profile.client_id)}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{profile.client_name}</p>
                    <p className="text-xs text-slate-600">
                      Analyzed {format(new Date(profile.analysis_date), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-600">Risk Score</p>
                      <p className="font-bold">{profile.overall_risk_score}</p>
                    </div>
                    <Badge className={riskBadgeColors[profile.overall_risk_level]}>
                      {profile.overall_risk_level}
                    </Badge>
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