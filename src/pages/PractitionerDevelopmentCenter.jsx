import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProfessionalDevelopmentDashboard from '@/components/practitioner/ProfessionalDevelopmentDashboard';
import { BookOpen, Users, Loader2, AlertCircle } from 'lucide-react';

export default function PractitionerDevelopmentCenter() {
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  // Fetch all practitioners
  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: async () => {
      const data = await base44.entities.Practitioner.list();
      return data?.filter(p => p.status === 'active') || [];
    }
  });

  const handleRunAnalysis = async () => {
    setAnalysisRunning(true);
    try {
      const result = await base44.functions.invoke('analyzePractitionerDevelopmentEnhanced', {});
      console.log('Analysis complete:', result.data);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalysisRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Professional Development Center</h1>
          <p className="text-slate-600 mt-2">Career pathways, training recommendations, and CPD tracking</p>
        </div>
        <Button
          onClick={handleRunAnalysis}
          disabled={analysisRunning}
          variant="outline"
        >
          {analysisRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze All Practitioners'
          )}
        </Button>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI-powered system analyzes skill gaps, performance metrics, and organizational needs to recommend targeted professional development pathways and training modules.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Development Dashboard
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Training Overview
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Practitioner Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Practitioner</CardTitle>
              <CardDescription>View career pathway and training recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPractitionerId || ''} onValueChange={setSelectedPractitionerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a practitioner..." />
                </SelectTrigger>
                <SelectContent>
                  {practitioners?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} - {p.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Development Dashboard */}
          {selectedPractitionerId && (
            <ProfessionalDevelopmentDashboard practitionerId={selectedPractitionerId} />
          )}

          {!selectedPractitionerId && (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-slate-500">
                <AlertCircle className="h-8 w-8 mr-3 opacity-50" />
                <span>Select a practitioner to view their development dashboard</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization-Wide Training Overview</CardTitle>
              <CardDescription>Summary of recommended training across all practitioners</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8 text-slate-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Run "Analyze All Practitioners" to generate organization-wide training recommendations</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}