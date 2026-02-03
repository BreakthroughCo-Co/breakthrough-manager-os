import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { ComplianceRulesEngine } from '@/components/rules/ComplianceRulesEngine';
import { ArtefactValidator } from '@/components/rules/ArtefactValidator';
import { ProbabilisticModels } from '@/components/intelligence/ProbabilisticModels';

export default function HybridIntelligence() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [probabilisticResults, setProbabilisticResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps'],
    queryFn: () => base44.entities.BehaviourSupportPlan.list(),
  });

  const { data: fbas = [] } = useQuery({
    queryKey: ['fbas'],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.list(),
  });

  const { data: serviceAgreements = [] } = useQuery({
    queryKey: ['serviceAgreements'],
    queryFn: () => base44.entities.ServiceAgreement.list(),
  });

  const { data: abcRecords = [] } = useQuery({
    queryKey: ['abcRecords'],
    queryFn: () => base44.entities.ABCRecord.list(),
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['caseNotes'],
    queryFn: () => base44.entities.CaseNote.list(),
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.RiskAssessment.list(),
  });

  // Deterministic Analysis
  const runDeterministicChecks = (client) => {
    const clientBSPs = bsps.filter(b => b.client_id === client.id);
    const clientFBAs = fbas.filter(f => f.client_id === client.id);
    const clientABC = abcRecords.filter(a => a.client_id === client.id);
    const clientAgreements = serviceAgreements.filter(sa => sa.client_id === client.id);

    // Compliance checks
    const bspCompliance = clientBSPs[0] ? 
      ComplianceRulesEngine.checkBSPCompliance(
        clientBSPs[0], 
        clientFBAs[0], 
        clientAgreements[0],
        clientABC
      ) : null;

    const clientCompliance = ComplianceRulesEngine.checkClientPlanCompliance(
      client,
      [],
      clientAgreements
    );

    // Missing artefacts
    const missingArtefacts = ArtefactValidator.detectMissingArtefacts(client, {
      fbas: clientFBAs,
      bsps: clientBSPs,
      serviceAgreements: clientAgreements,
      riskAssessments: riskAssessments.filter(r => r.client_id === client.id),
      caseNotes: caseNotes.filter(c => c.client_id === client.id),
      abcRecords: clientABC,
    });

    return {
      bspCompliance,
      clientCompliance,
      missingArtefacts,
    };
  };

  // Probabilistic Analysis
  const runProbabilisticAnalysis = async (client) => {
    setAnalyzing(true);
    try {
      const clientABC = abcRecords.filter(a => a.client_id === client.id);
      const clientCaseNotes = caseNotes.filter(c => c.client_id === client.id);
      const clientRiskAssessments = riskAssessments.filter(r => r.client_id === client.id);

      const [riskPrediction, trendAnalysis] = await Promise.all([
        ProbabilisticModels.predictRiskEscalation(
          client,
          clientABC,
          clientCaseNotes,
          clientRiskAssessments
        ),
        clientABC.length > 5 ? ProbabilisticModels.predictBehaviorTrend(clientABC) : null,
      ]);

      setProbabilisticResults({ riskPrediction, trendAnalysis });
    } catch (error) {
      console.error('Probabilistic analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const deterministicResults = selectedClientData ? runDeterministicChecks(selectedClientData) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hybrid Intelligence</h1>
          <p className="text-muted-foreground">Deterministic compliance + Probabilistic predictions</p>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-medium text-blue-900">Hybrid Reasoning Model</p>
              <p className="text-sm text-blue-800">
                <strong>Deterministic:</strong> Rule-based compliance checks (no AI) • 
                <strong> Probabilistic:</strong> AI-powered risk and trend predictions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.full_name} - {client.ndis_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClientData && (
        <Tabs defaultValue="deterministic">
          <TabsList>
            <TabsTrigger value="deterministic">
              <Shield className="w-4 h-4 mr-2" />
              Deterministic Rules
            </TabsTrigger>
            <TabsTrigger value="probabilistic">
              <Brain className="w-4 h-4 mr-2" />
              Probabilistic Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deterministic" className="space-y-4">
            {/* Compliance Checks */}
            {deterministicResults?.clientCompliance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Client Plan Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deterministicResults.clientCompliance.compliant ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        All compliance rules passed
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {deterministicResults.clientCompliance.violations.map((v, i) => (
                        <Alert key={i} className="bg-red-50 border-red-200">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-900">
                            <p className="font-medium">[{v.rule}] {v.message}</p>
                            <p className="text-xs">Standard: {v.standard} • Severity: {v.severity}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Missing Artefacts */}
            {deterministicResults?.missingArtefacts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Missing Artefacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deterministicResults.missingArtefacts.has_missing ? (
                    <div className="space-y-2">
                      {deterministicResults.missingArtefacts.missing_artefacts.map((m, i) => (
                        <Alert key={i} className={
                          m.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                        }>
                          <AlertTriangle className={`w-4 h-4 ${
                            m.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                          }`} />
                          <AlertDescription>
                            <p className="font-medium">{m.artefact_type}: {m.message}</p>
                            <p className="text-xs">Action: {m.action}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        All required artefacts present
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="probabilistic" className="space-y-4">
            <div className="flex justify-between items-center">
              <Alert className="bg-amber-50 border-amber-200 flex-1 mr-4">
                <Brain className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                  Predictions are probabilistic estimates, not compliance determinations
                </AlertDescription>
              </Alert>
              <Button onClick={() => runProbabilisticAnalysis(selectedClientData)} disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>

            {probabilisticResults?.riskPrediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Risk Escalation Prediction
                    </span>
                    <Badge variant="outline">Probabilistic</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-100 text-purple-800">
                      Likelihood: {probabilisticResults.riskPrediction.prediction.escalation_likelihood}
                    </Badge>
                    <Badge variant="outline">
                      {probabilisticResults.riskPrediction.prediction.confidence_level}% confidence
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Contributing Factors:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {probabilisticResults.riskPrediction.prediction.contributing_factors?.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {probabilisticResults.riskPrediction.prediction.early_warning_signs?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Early Warning Signs:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {probabilisticResults.riskPrediction.prediction.early_warning_signs.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {probabilisticResults?.trendAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Behavior Trend Analysis
                    </span>
                    <Badge variant="outline">Probabilistic</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <strong>Trend:</strong> {probabilisticResults.trendAnalysis.trend_analysis.trend_direction}
                  </p>
                  <p className="text-sm">
                    <strong>Confidence:</strong> {probabilisticResults.trendAnalysis.trend_analysis.confidence_level}%
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}