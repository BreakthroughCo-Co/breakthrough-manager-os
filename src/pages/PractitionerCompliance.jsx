import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { Shield, Plus, AlertTriangle, CheckCircle, Clock, Trash2, Edit, Grid } from 'lucide-react';
import SkillTrainingMatrix from '@/components/practitioner/SkillTrainingMatrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expiring_soon: { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700', icon: Clock },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  pending_renewal: { label: 'Pending Renewal', color: 'bg-blue-100 text-blue-700', icon: Clock },
  current: { label: 'Current', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  not_completed: { label: 'Not Completed', color: 'bg-slate-100 text-slate-600', icon: AlertTriangle },
};

const emptyCredential = {
  practitioner_id: '', practitioner_name: '', credential_type: 'NDIS_worker_screening',
  credential_name: '', registration_number: '', issuing_body: '',
  issue_date: '', expiry_date: '', status: 'active', certificate_url: '', notes: ''
};

const emptyTraining = {
  practitioner_id: '', practitioner_name: '', module_name: '',
  module_category: 'NDIS_code_of_conduct', completion_date: '',
  expiry_date: '', status: 'current', is_mandatory: true, provider: '', notes: ''
};

function DaysChip({ expiryDate }) {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  const color = days < 0 ? 'text-red-600 font-bold' : days <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-500';
  return <span className={cn('text-xs', color)}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span>;
}

export default function PractitionerCompliance() {
  const [credDialog, setCredDialog] = useState(false);
  const [trainingDialog, setTrainingDialog] = useState(false);
  const [editingCred, setEditingCred] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [credForm, setCredForm] = useState(emptyCredential);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [filterPractitioner, setFilterPractitioner] = useState('all');
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const queryClient = useQueryClient();

  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners'], queryFn: () => base44.entities.Practitioner.list() });
  const { data: credentials = [] } = useQuery({ queryKey: ['practitionerCredentials'], queryFn: () => base44.entities.PractitionerCredential.list('-expiry_date') });
  const { data: trainingRecords = [] } = useQuery({ queryKey: ['trainingRecords'], queryFn: () => base44.entities.TrainingRecord.list('-expiry_date') });

  const createCred = useMutation({ mutationFn: (d) => base44.entities.PractitionerCredential.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['practitionerCredentials'] }); setCredDialog(false); setCredForm(emptyCredential); } });
  const updateCred = useMutation({ mutationFn: ({ id, d }) => base44.entities.PractitionerCredential.update(id, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['practitionerCredentials'] }); setCredDialog(false); setEditingCred(null); } });
  const deleteCred = useMutation({ mutationFn: (id) => base44.entities.PractitionerCredential.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practitionerCredentials'] }) });

  const createTraining = useMutation({ mutationFn: (d) => base44.entities.TrainingRecord.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trainingRecords'] }); setTrainingDialog(false); setTrainingForm(emptyTraining); } });
  const updateTraining = useMutation({ mutationFn: ({ id, d }) => base44.entities.TrainingRecord.update(id, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trainingRecords'] }); setTrainingDialog(false); setEditingTraining(null); } });
  const deleteTraining = useMutation({ mutationFn: (id) => base44.entities.TrainingRecord.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainingRecords'] }) });

  const handlePractitionerSelect = (practitionerId, form, setForm) => {
    const p = practitioners.find(p => p.id === practitionerId);
    setForm({ ...form, practitioner_id: practitionerId, practitioner_name: p?.full_name || '' });
  };

  const handleRunCheck = async () => {
    setIsRunningCheck(true);
    await base44.functions.invoke('checkPractitionerCredentials', {});
    queryClient.invalidateQueries({ queryKey: ['practitionerCredentials'] });
    queryClient.invalidateQueries({ queryKey: ['trainingRecords'] });
    setIsRunningCheck(false);
  };

  const filtered = (arr) => filterPractitioner === 'all' ? arr : arr.filter(r => r.practitioner_id === filterPractitioner);

  const criticalCount = [...credentials, ...trainingRecords].filter(r => r.status === 'expired' || r.status === 'expiring_soon').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-600" />
            Practitioner Compliance Register
          </h2>
          <p className="text-slate-500 mt-1">Credentials, worker screening & mandatory training</p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-100 text-red-700 px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1 inline" />{criticalCount} Alerts
            </Badge>
          )}
          <Button variant="outline" onClick={handleRunCheck} disabled={isRunningCheck}>
            {isRunningCheck ? 'Checking...' : 'Run Alert Check'}
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterPractitioner} onValueChange={setFilterPractitioner}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Practitioners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Practitioners</SelectItem>
            {practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="credentials">

        <TabsList>
          <TabsTrigger value="credentials">Credentials & Screening ({filtered(credentials).length})</TabsTrigger>
          <TabsTrigger value="training">Mandatory Training ({filtered(trainingRecords).length})</TabsTrigger>
          <TabsTrigger value="matrix">Skill & Compliance Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCred(null); setCredForm(emptyCredential); setCredDialog(true); }} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />Add Credential
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Practitioner</TableHead>
                    <TableHead>Credential</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reg. Number</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered(credentials).map(cred => {
                    const cfg = statusConfig[cred.status] || statusConfig.active;
                    return (
                      <TableRow key={cred.id}>
                        <TableCell className="font-medium">{cred.practitioner_name}</TableCell>
                        <TableCell>{cred.credential_name || cred.credential_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="capitalize text-xs text-slate-500">{cred.credential_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="font-mono text-xs">{cred.registration_number || '-'}</TableCell>
                        <TableCell>{cred.expiry_date ? format(new Date(cred.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell><DaysChip expiryDate={cred.expiry_date} /></TableCell>
                        <TableCell><Badge className={cfg.color}>{cfg.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCred(cred); setCredForm(cred); setCredDialog(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteCred.mutate(cred.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered(credentials).length === 0 && (
                <div className="text-center py-10 text-slate-400">No credentials recorded.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingTraining(null); setTrainingForm(emptyTraining); setTrainingDialog(true); }} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />Add Training Record
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Practitioner</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered(trainingRecords).map(tr => {
                    const cfg = statusConfig[tr.status] || statusConfig.current;
                    return (
                      <TableRow key={tr.id}>
                        <TableCell className="font-medium">{tr.practitioner_name}</TableCell>
                        <TableCell>{tr.module_name}{tr.is_mandatory && <span className="ml-1 text-xs text-red-500">*</span>}</TableCell>
                        <TableCell className="capitalize text-xs text-slate-500">{tr.module_category?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{tr.provider || '-'}</TableCell>
                        <TableCell>{tr.completion_date ? format(new Date(tr.completion_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm">{tr.expiry_date ? format(new Date(tr.expiry_date), 'dd MMM yyyy') : '-'}</span>
                            <DaysChip expiryDate={tr.expiry_date} />
                          </div>
                        </TableCell>
                        <TableCell><Badge className={cfg.color}>{cfg.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingTraining(tr); setTrainingForm(tr); setTrainingDialog(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteTraining.mutate(tr.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered(trainingRecords).length === 0 && (
                <div className="text-center py-10 text-slate-400">No training records. <span className="text-xs text-red-500">* = mandatory</span></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credential Dialog */}
      <Dialog open={credDialog} onOpenChange={setCredDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCred ? 'Edit Credential' : 'Add Credential'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="col-span-2">
              <Label>Practitioner *</Label>
              <Select value={credForm.practitioner_id} onValueChange={(v) => handlePractitionerSelect(v, credForm, setCredForm)}>
                <SelectTrigger><SelectValue placeholder="Select practitioner" /></SelectTrigger>
                <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credential Type *</Label>
              <Select value={credForm.credential_type} onValueChange={(v) => setCredForm({ ...credForm, credential_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NDIS_worker_screening','AHPRA_registration','first_aid','CPR','mandatory_reporting','privacy_training','manual_handling','positive_behaviour_support','restrictive_practices_authorisation','other'].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={credForm.credential_name} onChange={e => setCredForm({ ...credForm, credential_name: e.target.value })} placeholder="e.g. NDIS Worker Screening Check" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={credForm.registration_number} onChange={e => setCredForm({ ...credForm, registration_number: e.target.value })} />
            </div>
            <div>
              <Label>Issuing Body</Label>
              <Input value={credForm.issuing_body} onChange={e => setCredForm({ ...credForm, issuing_body: e.target.value })} />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={credForm.issue_date} onChange={e => setCredForm({ ...credForm, issue_date: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date *</Label>
              <Input type="date" value={credForm.expiry_date} onChange={e => setCredForm({ ...credForm, expiry_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={credForm.status} onValueChange={(v) => setCredForm({ ...credForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={!credForm.practitioner_id || !credForm.expiry_date} onClick={() => editingCred ? updateCred.mutate({ id: editingCred.id, d: credForm }) : createCred.mutate(credForm)}>
              {editingCred ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Dialog */}
      <Dialog open={trainingDialog} onOpenChange={setTrainingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTraining ? 'Edit Training Record' : 'Add Training Record'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="col-span-2">
              <Label>Practitioner *</Label>
              <Select value={trainingForm.practitioner_id} onValueChange={(v) => handlePractitionerSelect(v, trainingForm, setTrainingForm)}>
                <SelectTrigger><SelectValue placeholder="Select practitioner" /></SelectTrigger>
                <SelectContent>{practitioners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Module Name *</Label>
              <Input value={trainingForm.module_name} onChange={e => setTrainingForm({ ...trainingForm, module_name: e.target.value })} placeholder="e.g. NDIS Code of Conduct" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={trainingForm.module_category} onValueChange={(v) => setTrainingForm({ ...trainingForm, module_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NDIS_code_of_conduct','first_aid','CPR','mandatory_reporting','privacy_and_confidentiality','manual_handling','positive_behaviour_support','restrictive_practices','worker_screening','clinical_governance','other'].map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider</Label>
              <Input value={trainingForm.provider} onChange={e => setTrainingForm({ ...trainingForm, provider: e.target.value })} />
            </div>
            <div>
              <Label>Mandatory</Label>
              <Select value={String(trainingForm.is_mandatory)} onValueChange={(v) => setTrainingForm({ ...trainingForm, is_mandatory: v === 'true' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes — Mandatory</SelectItem>
                  <SelectItem value="false">No — Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion Date</Label>
              <Input type="date" value={trainingForm.completion_date} onChange={e => setTrainingForm({ ...trainingForm, completion_date: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={trainingForm.expiry_date} onChange={e => setTrainingForm({ ...trainingForm, expiry_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={trainingForm.status} onValueChange={(v) => setTrainingForm({ ...trainingForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="not_completed">Not Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={!trainingForm.practitioner_id || !trainingForm.module_name} onClick={() => editingTraining ? updateTraining.mutate({ id: editingTraining.id, d: trainingForm }) : createTraining.mutate(trainingForm)}>
              {editingTraining ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}