import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IncidentReportDialog from '@/components/incidents/IncidentReportDialog';
import { User, Phone, Mail, FileText, MessageSquare, AlertTriangle, Shield, Users, Plus, Calendar, Activity, Sparkles, Loader2, Search } from 'lucide-react';

export default function ClientDetail() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: '',
    contact_type: 'parent',
    relationship: '',
    phone: '',
    email: '',
  });
  const [summaries, setSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [comprehensiveSummary, setComprehensiveSummary] = useState(null);
  const [isLoadingComprehensive, setIsLoadingComprehensive] = useState(false);

  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0];
    },
    enabled: !!clientId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts', clientId],
    queryFn: () => base44.entities.ClientContact.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['clientBsps', clientId],
    queryFn: () => base44.entities.BehaviourSupportPlan.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['clientCommunications', clientId],
    queryFn: () => base44.entities.ClientCommunication.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: caseNotes = [] } = useQuery({
    queryKey: ['clientCaseNotes', clientId],
    queryFn: () => base44.entities.CaseNote.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['clientIncidents', clientId],
    queryFn: () => base44.entities.Incident.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: auditReports = [] } = useQuery({
    queryKey: ['auditReports'],
    queryFn: () => base44.entities.ComplianceAuditReport.list('-audit_date', 10),
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      setIsAddContactOpen(false);
      setContactForm({ full_name: '', contact_type: 'parent', relationship: '', phone: '', email: '' });
    },
  });

  const handleAddContact = async () => {
    await createContactMutation.mutateAsync({
      ...contactForm,
      client_id: clientId,
      is_active: true,
    });
  };

  const activeBsp = bsps.find(b => b.status === 'active');
  const recentComms = communications.slice(0, 5);
  const recentNotes = caseNotes.slice(0, 5);
  
  // Apply filters to incidents
  let filteredIncidents = incidents;
  if (searchTerm) {
    filteredIncidents = filteredIncidents.filter(i => 
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (filterCategory !== 'all') {
    filteredIncidents = filteredIncidents.filter(i => i.category === filterCategory);
  }
  if (filterSeverity !== 'all') {
    filteredIncidents = filteredIncidents.filter(i => i.severity === filterSeverity);
  }
  const recentIncidents = filteredIncidents.slice(0, 10);

  // Find compliance issues related to this client
  const clientComplianceIssues = auditReports.flatMap(report => {
    try {
      const findings = JSON.parse(report.findings || '[]');
      return findings.filter(f => f.client_id === clientId || f.related_to?.includes(clientId));
    } catch {
      return [];
    }
  });

  const generateSummary = async (section) => {
    setLoadingSummary(section);
    try {
      const result = await base44.functions.invoke('generateClientHistorySummary', {
        client_id: clientId,
        section: section,
      });
      setSummaries({ ...summaries, [section]: result.data.summary });
    } catch (error) {
      alert('Failed to generate summary: ' + error.message);
    } finally {
      setLoadingSummary(null);
    }
  };

  const handleCalculateRisk = async () => {
    setIsLoadingRisk(true);
    try {
      const result = await base44.functions.invoke('calculateClientRiskScore', {
        client_id: clientId,
      });
      setRiskAssessment(result.data);
    } catch (error) {
      alert('Failed to calculate risk: ' + error.message);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  const handleGenerateComprehensive = async () => {
    setIsLoadingComprehensive(true);
    try {
      const result = await base44.functions.invoke('generateClientHistorySummary', {
        client_id: clientId,
        include_sections: ['overview', 'bsp', 'intake', 'progress', 'risks'],
      });
      setComprehensiveSummary(result.data);
    } catch (error) {
      alert('Failed to generate summary: ' + error.message);
    } finally {
      setIsLoadingComprehensive(false);
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading client information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.full_name}</h1>
          <p className="text-muted-foreground">NDIS #: {client.ndis_number}</p>
        </div>
        <div className="flex gap-2">
          <IncidentReportDialog 
            clientId={clientId} 
            clientName={client.full_name}
            trigger={
              <Button variant="outline">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
            }
          />
          <Badge variant={client.status === 'active' ? 'default' : 'outline'}>
            {client.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bsps.length}</p>
                <p className="text-xs text-muted-foreground">BSPs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{communications.length}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{incidents.length}</p>
                <p className="text-xs text-muted-foreground">Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Comprehensive History</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="bsps">BSPs</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Client Information</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCalculateRisk}
                    disabled={isLoadingRisk}
                  >
                    {isLoadingRisk ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4 mr-2" />
                    )}
                    AI Risk Assessment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {riskAssessment && (
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-orange-900">AI Risk Analysis</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          riskAssessment.assessment.risk_level === 'critical' ? 'destructive' :
                          riskAssessment.assessment.risk_level === 'high' ? 'destructive' :
                          riskAssessment.assessment.risk_level === 'medium' ? 'secondary' : 'default'
                        }>
                          {riskAssessment.assessment.risk_level}
                        </Badge>
                        <span className="text-2xl font-bold text-orange-900">
                          {riskAssessment.assessment.risk_score}/100
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-orange-800">Contributing Factors:</p>
                        <ul className="list-disc list-inside text-orange-700">
                          {riskAssessment.assessment.contributing_factors?.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-orange-800">Trend: <span className="text-orange-900">{riskAssessment.assessment.risk_trend}</span></p>
                      </div>
                      {riskAssessment.assessment.immediate_concerns?.length > 0 && (
                        <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                          <p className="font-medium text-red-900">Immediate Concerns:</p>
                          <ul className="list-disc list-inside text-red-800 text-xs">
                            {riskAssessment.assessment.immediate_concerns.map((concern, idx) => (
                              <li key={idx}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service Type</p>
                    <p className="font-medium">{client.service_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan Period</p>
                    <p className="font-medium">
                      {client.plan_start_date && client.plan_end_date
                        ? `${new Date(client.plan_start_date).toLocaleDateString()} - ${new Date(client.plan_end_date).toLocaleDateString()}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk Level</p>
                    <Badge variant={client.risk_level === 'high' ? 'destructive' : 'secondary'}>
                      {client.risk_level || 'low'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active BSP</CardTitle>
              </CardHeader>
              <CardContent>
                {activeBsp ? (
                  <div className="space-y-2">
                    <p className="text-sm"><span className="font-medium">Version:</span> {activeBsp.plan_version}</p>
                    <p className="text-sm"><span className="font-medium">Start Date:</span> {new Date(activeBsp.start_date).toLocaleDateString()}</p>
                    <p className="text-sm"><span className="font-medium">Review Date:</span> {new Date(activeBsp.review_date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{activeBsp.behaviour_summary?.substring(0, 150)}...</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active BSP</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateSummary('case_notes')}
                  disabled={loadingSummary === 'case_notes'}
                >
                  {loadingSummary === 'case_notes' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaries.case_notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">AI-Generated Summary:</p>
                  <p className="text-sm text-blue-800">{summaries.case_notes}</p>
                </div>
              )}
              <div className="space-y-3">
                {recentNotes.map(note => (
                  <div key={note.id} className="border-l-2 border-teal-200 pl-3 py-1">
                    <p className="text-sm font-medium">{note.session_date}</p>
                    <p className="text-xs text-muted-foreground">{note.summary?.substring(0, 100)}...</p>
                  </div>
                ))}
                {recentNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent case notes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Comprehensive Client History</CardTitle>
                <Button
                  onClick={handleGenerateComprehensive}
                  disabled={isLoadingComprehensive}
                >
                  {isLoadingComprehensive ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate AI Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {comprehensiveSummary && (
                <div className="prose prose-sm max-w-none">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">AI-Generated Comprehensive Summary</h4>
                    <div className="text-sm text-blue-800 whitespace-pre-wrap">{comprehensiveSummary.comprehensive_summary}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">BSPs</p>
                      <p className="text-2xl font-bold">{comprehensiveSummary.data_summary?.bsp_count || 0}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Case Notes</p>
                      <p className="text-2xl font-bold">{comprehensiveSummary.data_summary?.case_notes_count || 0}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Incidents</p>
                      <p className="text-2xl font-bold">{comprehensiveSummary.data_summary?.incidents_count || 0}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Communications</p>
                      <p className="text-2xl font-bold">{comprehensiveSummary.data_summary?.communications_count || 0}</p>
                    </div>
                  </div>
                </div>
              )}
              {!comprehensiveSummary && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click "Generate AI Summary" to create a comprehensive analysis of this client's history, including BSPs, intake assessments, progress trends, and risk factors.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Contact Network</h3>
            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={contactForm.full_name}
                      onChange={(e) => setContactForm({...contactForm, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Contact Type</Label>
                    <Select value={contactForm.contact_type} onValueChange={(val) => setContactForm({...contactForm, contact_type: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="family_member">Family Member</SelectItem>
                        <SelectItem value="support_coordinator">Support Coordinator</SelectItem>
                        <SelectItem value="case_manager">Case Manager</SelectItem>
                        <SelectItem value="advocate">Advocate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input
                      value={contactForm.relationship}
                      onChange={(e) => setContactForm({...contactForm, relationship: e.target.value})}
                      placeholder="e.g., Mother, Support Coordinator"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    />
                  </div>
                  <Button
                    onClick={handleAddContact}
                    disabled={!contactForm.full_name}
                    className="w-full"
                  >
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map(contact => (
              <Card key={contact.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{contact.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                      </div>
                      <Badge variant="secondary">{contact.contact_type.replace('_', ' ')}</Badge>
                    </div>
                    {contact.phone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {contact.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bsps">
          <div className="space-y-3">
            {bsps.map(bsp => (
              <Card key={bsp.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Version {bsp.plan_version}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(bsp.start_date).toLocaleDateString()} - Review: {new Date(bsp.review_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={bsp.status === 'active' ? 'default' : 'outline'}>
                      {bsp.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communications">
          <div className="space-y-3">
            {recentComms.map(comm => (
              <Card key={comm.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{comm.subject}</h4>
                      <Badge variant="secondary">{comm.communication_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(comm.sent_date).toLocaleDateString()} • {comm.sent_by}
                    </p>
                    <p className="text-sm">{comm.message_body.substring(0, 150)}...</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Incident Analysis</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateSummary('incidents')}
                  disabled={loadingSummary === 'incidents'}
                >
                  {loadingSummary === 'incidents' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Risk Assessment
                </Button>
              </div>
            </CardHeader>
            {summaries.incidents && (
              <CardContent>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs font-medium text-orange-900 mb-1">AI Risk Assessment:</p>
                  <p className="text-sm text-orange-800">{summaries.incidents}</p>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filter & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search incidents..."
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="client_behaviour">Client Behaviour</SelectItem>
                      <SelectItem value="safety_concern">Safety Concern</SelectItem>
                      <SelectItem value="policy_breach">Policy Breach</SelectItem>
                      <SelectItem value="injury">Injury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Severity</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {recentIncidents.map(incident => (
              <Card key={incident.id} className={
                incident.severity === 'critical' || incident.severity === 'high' 
                  ? 'border-l-4 border-l-red-500' 
                  : ''
              }>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={
                          incident.severity === 'critical' || incident.severity === 'high'
                            ? 'w-5 h-5 text-red-600'
                            : 'w-5 h-5 text-orange-600'
                        } />
                        <h4 className="font-semibold capitalize">{incident.category.replace(/_/g, ' ')}</h4>
                      </div>
                      <Badge variant={incident.severity === 'critical' || incident.severity === 'high' ? 'destructive' : 'secondary'}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(incident.incident_date).toLocaleString()}
                    </p>
                    <p className="text-sm">{incident.description.substring(0, 200)}...</p>
                    {incident.ndis_reportable && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        NDIS Reportable
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance Audit Findings</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateSummary('compliance')}
                  disabled={loadingSummary === 'compliance'}
                >
                  {loadingSummary === 'compliance' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaries.compliance && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-medium text-purple-900 mb-1">AI Compliance Analysis:</p>
                  <p className="text-sm text-purple-800">{summaries.compliance}</p>
                </div>
              )}
              {clientComplianceIssues.length > 0 ? (
                <div className="space-y-3">
                  {clientComplianceIssues.map((issue, idx) => (
                    <div key={idx} className="border-l-2 border-orange-200 pl-3 py-2">
                      <p className="font-medium text-sm">{issue.standard}</p>
                      <p className="text-xs text-muted-foreground">{issue.issue}</p>
                      {issue.remediation && (
                        <p className="text-xs text-blue-600 mt-1">→ {issue.remediation}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No compliance issues identified for this client
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}