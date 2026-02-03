import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Users, 
  FileText,
  Award
} from 'lucide-react';

/**
 * Automated Compliance Readiness Dashboard
 * Live audit scores per participant and practitioner
 * Maps artifacts to NDIS Practice Standards
 */
export default function ComplianceReadiness() {
  const [viewMode, setViewMode] = useState('overview');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 100),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
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

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['complianceItems'],
    queryFn: () => base44.entities.ComplianceItem.list(),
  });

  // Calculate compliance scores
  const calculateClientCompliance = (client) => {
    let score = 0;
    let maxScore = 100;

    // Active NDIS plan (20 points)
    if (client.plan_start_date && client.plan_end_date) {
      const now = new Date();
      const planEnd = new Date(client.plan_end_date);
      if (planEnd > now) score += 20;
    }

    // Service agreement (20 points)
    const hasAgreement = serviceAgreements.some(
      sa => sa.client_id === client.id && sa.status === 'active'
    );
    if (hasAgreement) score += 20;

    // FBA (20 points)
    const hasFBA = fbas.some(f => f.client_id === client.id && f.status === 'completed');
    if (hasFBA) score += 20;

    // BSP (30 points)
    const hasBSP = bsps.some(
      b => b.client_id === client.id && 
      (b.status === 'active' || b.status === 'approved') &&
      b.lifecycle_stage === 'published'
    );
    if (hasBSP) score += 30;

    // Review date not overdue (10 points)
    if (client.plan_end_date) {
      const reviewDue = new Date(client.plan_end_date);
      reviewDue.setDate(reviewDue.getDate() - 60); // 60 days before expiry
      if (new Date() < reviewDue) score += 10;
    }

    return { score, maxScore, percentage: (score / maxScore) * 100 };
  };

  const calculatePractitionerCompliance = (practitioner) => {
    let score = 0;
    let maxScore = 100;

    // Active status (20 points)
    if (practitioner.status === 'active') score += 20;

    // Registration number (20 points)
    if (practitioner.registration_number) score += 20;

    // Certifications (20 points)
    if (practitioner.certifications && practitioner.certifications.length > 0) score += 20;

    // Caseload within capacity (20 points)
    if (practitioner.current_caseload <= practitioner.caseload_capacity) score += 20;

    // Billable hours tracking (20 points)
    if (practitioner.billable_hours_target && practitioner.billable_hours_actual >= 0) score += 20;

    return { score, maxScore, percentage: (score / maxScore) * 100 };
  };

  const ndisStandards = [
    {
      code: '1A',
      name: 'Rights and Responsibilities',
      description: 'Uphold participant rights and informed decision-making',
      items: complianceItems.filter(c => c.category === 'Quality & Safeguards').length,
    },
    {
      code: '1B',
      name: 'Risk Management',
      description: 'Identify and respond to risks appropriately',
      items: complianceItems.filter(c => c.category === 'Clinical Governance').length,
    },
    {
      code: '2A',
      name: 'Service Access',
      description: 'Accessible and timely service delivery',
      items: serviceAgreements.filter(sa => sa.status === 'active').length,
    },
    {
      code: '3A',
      name: 'Behaviour Support',
      description: 'Evidence-based positive behaviour support',
      items: bsps.filter(b => b.lifecycle_stage === 'published').length,
    },
    {
      code: '4A',
      name: 'Workforce Capability',
      description: 'Qualified and trained workforce',
      items: practitioners.filter(p => p.status === 'active').length,
    },
  ];

  const clientScores = clients.map(c => ({
    ...c,
    compliance: calculateClientCompliance(c),
  })).sort((a, b) => a.compliance.percentage - b.compliance.percentage);

  const practitionerScores = practitioners.map(p => ({
    ...p,
    compliance: calculatePractitionerCompliance(p),
  })).sort((a, b) => a.compliance.percentage - b.compliance.percentage);

  const overallCompliance = {
    clients: clientScores.reduce((sum, c) => sum + c.compliance.percentage, 0) / (clientScores.length || 1),
    practitioners: practitionerScores.reduce((sum, p) => sum + p.compliance.percentage, 0) / (practitionerScores.length || 1),
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compliance Readiness</h1>
          <p className="text-muted-foreground">Automated audit scores and NDIS Practice Standards mapping</p>
        </div>
        <Badge className="bg-teal-100 text-teal-800">
          <Shield className="w-3 h-3 mr-1" />
          NDIS Aligned
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Client Compliance</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallCompliance.clients)}%</div>
            <Progress value={overallCompliance.clients} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Practitioner Compliance</CardTitle>
            <Award className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallCompliance.practitioners)}%</div>
            <Progress value={overallCompliance.practitioners} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published BSPs</CardTitle>
            <FileText className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bsps.filter(b => b.lifecycle_stage === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">of {bsps.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceItems.filter(c => c.status === 'non_compliant').length}
            </div>
            <p className="text-xs text-muted-foreground">require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* NDIS Practice Standards */}
      <Card>
        <CardHeader>
          <CardTitle>NDIS Practice Standards Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ndisStandards.map(standard => (
              <div key={standard.code} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{standard.code}</Badge>
                    <p className="font-medium">{standard.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{standard.description}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold">{standard.items}</p>
                  <p className="text-xs text-muted-foreground">artifacts</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Compliance Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientScores.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-sm text-muted-foreground">{client.ndis_number}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={client.compliance.percentage} className="w-32" />
                      <Badge className={getScoreBadge(client.compliance.percentage)}>
                        {Math.round(client.compliance.percentage)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practitioners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Compliance Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {practitionerScores.map(prac => (
                  <div key={prac.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{prac.full_name}</p>
                      <p className="text-sm text-muted-foreground">{prac.role}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={prac.compliance.percentage} className="w-32" />
                      <Badge className={getScoreBadge(prac.compliance.percentage)}>
                        {Math.round(prac.compliance.percentage)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}