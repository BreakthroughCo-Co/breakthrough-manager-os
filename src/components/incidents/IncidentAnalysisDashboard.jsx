import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Zap, TrendingUp, Shield, Loader2 } from 'lucide-react';

export default function IncidentAnalysisDashboard() {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const queryClient = useQueryClient();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 50)
  });

  const analyzeMutation = useMutation({
    mutationFn: (incidentId) =>
      base44.functions.invoke('analyzeIncidentReport', { incident_id: incidentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setSelectedIncident(null);
    }
  });

  const severityColor = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    serious_injury: 'bg-red-100 text-red-800 border-red-300',
    safeguarding_concern: 'bg-orange-100 text-orange-800 border-orange-300',
    non_compliance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    operational_issue: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const riskColor = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-600">Total Incidents (30d)</div>
            <div className="text-3xl font-bold mt-2">
              {incidents?.filter(i => new Date(i.incident_date) > new Date(Date.now() - 30*24*60*60*1000)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-600">Critical/Serious</div>
            <div className="text-3xl font-bold mt-2 text-red-600">
              {incidents?.filter(i => ['critical', 'serious_injury'].includes(i.severity)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-600">High Recurrence Risk</div>
            <div className="text-3xl font-bold mt-2 text-orange-600">
              {incidents?.filter(i => i.recurrence_risk === 'high').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-600">Pending Analysis</div>
            <div className="text-3xl font-bold mt-2 text-slate-600">
              {incidents?.filter(i => !i.severity).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList>
          <TabsTrigger value="incidents">Incident Log</TabsTrigger>
          <TabsTrigger value="analysis">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="prevention">Prevention Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {incidents?.map((incident) => (
                <Card
                  key={incident.id}
                  className="cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{incident.client_name}</div>
                          {incident.severity && (
                            <Badge className={severityColor[incident.severity]}>
                              {incident.severity.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {!incident.severity && (
                            <Badge variant="outline">Pending Analysis</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{incident.description.substring(0, 80)}...</p>
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(incident.incident_date).toLocaleDateString()} • {incident.location}
                        </div>
                      </div>
                      {incident.risk_score && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-600">Risk Score</div>
                          <div className={`text-2xl font-bold ${incident.risk_score > 70 ? 'text-red-600' : incident.risk_score > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                            {incident.risk_score}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis">
          {selectedIncident && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedIncident.client_name} - Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedIncident.severity ? (
                  <>
                    <div>
                      <h4 className="font-medium mb-3">Root Cause & Contributing Factors</h4>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Root Cause</AlertTitle>
                        <AlertDescription>{selectedIncident.root_cause}</AlertDescription>
                      </Alert>
                      <div className="mt-3 space-y-2">
                        <h5 className="text-sm font-medium">Contributing Factors:</h5>
                        {selectedIncident.contributing_factors?.map((factor, i) => (
                          <div key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-slate-400">•</span> {factor}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Recurrence Risk Assessment</h4>
                      <div className="flex items-center gap-3">
                        <Badge className={riskColor[selectedIncident.recurrence_risk]}>
                          {selectedIncident.recurrence_risk.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-slate-600">
                          Risk Score: <span className="font-semibold">{selectedIncident.risk_score}/100</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Recommended Preventative Measures
                      </h4>
                      <div className="space-y-2">
                        {selectedIncident.preventative_measures?.map((measure, i) => (
                          <div key={i} className="text-sm text-slate-700 bg-blue-50 p-3 rounded-lg flex gap-2">
                            <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            {measure}
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedIncident.similar_incidents?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Pattern Detected
                        </h4>
                        <Alert variant="destructive">
                          <AlertTitle>Similar Incidents Found</AlertTitle>
                          <AlertDescription>
                            {selectedIncident.similar_incidents.length} similar incidents detected in past 12 months. Recommend immediate intervention.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600 mb-4">AI analysis required for this incident</p>
                    <Button
                      onClick={() => analyzeMutation.mutate(selectedIncident.id)}
                      disabled={analyzeMutation.isPending}
                    >
                      {analyzeMutation.isPending ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prevention">
          <Card>
            <CardHeader>
              <CardTitle>Prevention Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">Track implementation and effectiveness of preventative measures across incidents.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}