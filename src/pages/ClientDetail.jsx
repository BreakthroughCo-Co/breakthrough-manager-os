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
import { User, Phone, Mail, FileText, MessageSquare, AlertTriangle, Shield, Users, Plus, Calendar, Activity } from 'lucide-react';

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
  const recentIncidents = incidents.slice(0, 5);

  // Find compliance issues related to this client
  const clientComplianceIssues = auditReports.flatMap(report => {
    try {
      const findings = JSON.parse(report.findings || '[]');
      return findings.filter(f => f.client_id === clientId || f.related_to?.includes(clientId));
    } catch {
      return [];
    }
  });

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
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
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

        <TabsContent value="incidents">
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
              <CardTitle>Compliance Audit Findings</CardTitle>
            </CardHeader>
            <CardContent>
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