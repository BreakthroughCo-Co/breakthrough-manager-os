import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Edit2, ArrowLeft } from 'lucide-react';
import ClientProfileForm from '@/components/client/ClientProfileForm';
import ClientPractitionerLink from '@/components/client/ClientPractitionerLink';
import ClientContactNetwork from '@/components/client/ClientContactNetwork';
import ClientGoalsSection from '@/components/client/ClientGoalsSection';
import ClientAppointmentsSection from '@/components/client/ClientAppointmentsSection';
import ClientQuickActions from '@/components/client/ClientQuickActions';
import ClientOutcomePrediction from '@/components/client/ClientOutcomePrediction';
import ClientFeedbackDisplay from '@/components/feedback/ClientFeedbackDisplay';
import ClientCommunicationDrafter from '@/components/communication/ClientCommunicationDrafter';
import GoalSuccessAnalysis from '@/components/client/GoalSuccessAnalysis';
import PredictiveRiskMonitor from '@/components/client/PredictiveRiskMonitor';
import DynamicClientPathway from '@/components/client/DynamicClientPathway';
import AISupportPlanGenerator from '@/components/clinical/AISupportPlanGenerator';
import SupportPlanUpdateSuggestions from '@/components/clinical/SupportPlanUpdateSuggestions';
import NDISPlanExtractor from '@/components/client/NDISPlanExtractor';
import FundingForecastPanel from '@/components/client/FundingForecastPanel';

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: client, isLoading, error } = useQuery({
    queryKey: ['clientDetail', clientId],
    queryFn: () => base44.entities.Client.get(clientId),
    enabled: !!clientId
  });

  const { data: riskProfile } = useQuery({
    queryKey: ['clientRiskProfile', clientId],
    queryFn: () => base44.entities.ClientRiskProfile.filter({ client_id: clientId }, '-analysis_date', 1),
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to load client details</AlertTitle>
      </Alert>
    );
  }

  const riskConfig = {
    low: { color: 'bg-green-100 text-green-800 border-green-300' },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    high: { color: 'bg-red-100 text-red-800 border-red-300' }
  };

  const statusConfig = {
    active: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    waitlist: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    on_hold: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
    discharged: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800' },
    plan_review: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' }
  };

  const status = statusConfig[client.status] || statusConfig.active;
  const riskColor = riskConfig[client.risk_level] || riskConfig.low;
  const currentRisk = riskProfile?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/Clients')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        <div className="flex gap-2">
          {!isEditingProfile && (
            <ClientQuickActions clientId={clientId} clientName={client.full_name} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            {isEditingProfile ? 'View' : 'Edit'} Profile
          </Button>
        </div>
      </div>

      {/* Profile Summary Header */}
      {!isEditingProfile && (
        <Card className={`${status.bg} border ${status.border}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{client.full_name}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="text-lg">{client.service_type}</Badge>
                  <Badge className={riskColor.color}>{client.risk_level.toUpperCase()} Risk</Badge>
                  <Badge variant="outline">{client.status.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">NDIS Participant</p>
                <p className="text-xl font-mono font-bold">{client.ndis_number}</p>
              </div>
            </div>

            {client.date_of_birth && (
              <p className="text-sm text-slate-600 mt-2">
                <strong>DOB:</strong> {new Date(client.date_of_birth).toLocaleDateString()}
              </p>
            )}

            {client.plan_end_date && (
              <p className="text-sm text-slate-600">
                <strong>Plan Expires:</strong> {new Date(client.plan_end_date).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Form */}
      {isEditingProfile && (
        <ClientProfileForm
          clientId={clientId}
          onSave={() => setIsEditingProfile(false)}
        />
      )}

      {/* Main Content Tabs */}
      {!isEditingProfile && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="support_plan">AI Support Plan</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Funding Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">NDIS Funding Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.funding_allocated ? (
                    <>
                      <div>
                        <p className="text-xs text-slate-600">Allocated</p>
                        <p className="text-2xl font-bold">${client.funding_allocated.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Utilised</p>
                        <p className="text-lg font-semibold">${(client.funding_utilised || 0).toFixed(2)}</p>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs text-slate-600 mb-1">Available</p>
                        <p className="text-lg font-bold text-green-600">
                          ${(client.funding_allocated - (client.funding_utilised || 0)).toFixed(2)}
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${((client.funding_utilised || 0) / client.funding_allocated) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-600 text-sm">No funding allocated</p>
                  )}
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              {currentRisk && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Risk Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600">Overall Risk Level</p>
                      <Badge className={riskColor.color} style={{ width: 'fit-content' }}>
                        {currentRisk.overall_risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    {currentRisk.overall_risk_score !== undefined && (
                      <div>
                        <p className="text-xs text-slate-600">Risk Score</p>
                        <p className="text-2xl font-bold">{currentRisk.overall_risk_score}/100</p>
                      </div>
                    )}
                    {currentRisk.trend_direction && (
                      <p className="text-xs text-slate-600 mt-2">
                        <strong>Trend:</strong> {currentRisk.trend_direction}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AI Outcome Prediction */}
              <ClientOutcomePrediction clientId={clientId} />
            </div>

            <FundingForecastPanel clientId={clientId} client={client} />
            <NDISPlanExtractor clientId={clientId} />
            <GoalSuccessAnalysis clientId={clientId} clientName={client?.full_name} />
            <PredictiveRiskMonitor clientId={clientId} clientName={client?.full_name} />

            {/* Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Plan Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Start Date</p>
                    <p className="font-medium">
                      {client.plan_start_date ? new Date(client.plan_start_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">End Date</p>
                    <p className="font-medium">
                      {client.plan_end_date ? new Date(client.plan_end_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI SUPPORT PLAN TAB */}
          <TabsContent value="support_plan">
            <div className="space-y-6">
              <AISupportPlanGenerator clientId={clientId} />
              <SupportPlanUpdateSuggestions clientId={clientId} />
              <DynamicClientPathway clientId={clientId} clientName={client?.full_name} />
            </div>
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments">
            <ClientAppointmentsSection clientId={clientId} />
          </TabsContent>

          {/* GOALS TAB */}
          <TabsContent value="goals">
            <ClientGoalsSection clientId={clientId} />
          </TabsContent>

          {/* CONTACTS & SERVICES TAB */}
          <TabsContent value="contacts" className="space-y-4">
            <ClientPractitionerLink clientId={clientId} currentPractitionerId={client.assigned_practitioner_id} />
            <ClientContactNetwork clientId={clientId} />
            <ClientFeedbackDisplay clientId={clientId} />
            <ClientCommunicationDrafter 
              clientId={clientId} 
              clientName={client?.full_name}
              onSend={(data) => console.log('Send communication:', data)}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}