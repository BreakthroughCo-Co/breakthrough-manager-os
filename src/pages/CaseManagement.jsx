import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Plus, Filter, Sparkles, Loader2, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';

export default function CaseManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [caseForm, setCaseForm] = useState({
    case_title: '',
    case_type: 'general',
    priority: 'medium',
    case_description: '',
    assigned_staff_id: '',
    opened_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });
  const [isSummarizing, setIsSummarizing] = useState(false);

  const queryClient = useQueryClient();

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.Case.list('-opened_date'),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.filter({ status: 'active' }),
  });

  const createCaseMutation = useMutation({
    mutationFn: (data) => base44.entities.Case.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setIsCreateDialogOpen(false);
      setCaseForm({
        case_title: '',
        case_type: 'general',
        priority: 'medium',
        case_description: '',
        assigned_staff_id: '',
        opened_date: new Date().toISOString().split('T')[0],
        due_date: '',
      });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Case.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const handleCreateCase = async () => {
    const user = await base44.auth.me();
    const practitioner = practitioners.find(p => p.id === caseForm.assigned_staff_id);
    
    await createCaseMutation.mutateAsync({
      ...caseForm,
      assigned_staff_name: practitioner?.full_name || '',
      case_status: 'open',
      case_number: `CASE-${Date.now()}`,
      created_by: user.email,
    });
  };

  const handleSummarizeCase = async (caseId) => {
    setIsSummarizing(true);
    try {
      const result = await base44.functions.invoke('summarizeCaseNotes', {
        case_id: caseId,
      });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      alert('Case summary generated successfully');
    } catch (error) {
      alert('Failed to generate summary: ' + error.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleUpdateStatus = async (caseId, newStatus) => {
    await updateCaseMutation.mutateAsync({
      id: caseId,
      data: { 
        case_status: newStatus,
        ...(newStatus === 'closed' && { closed_date: new Date().toISOString().split('T')[0] })
      },
    });
  };

  const filteredCases = cases.filter(c => {
    const statusMatch = filterStatus === 'all' || c.case_status === filterStatus;
    const staffMatch = filterStaff === 'all' || c.assigned_staff_id === filterStaff;
    return statusMatch && staffMatch;
  });

  const statusCounts = {
    open: cases.filter(c => c.case_status === 'open').length,
    in_progress: cases.filter(c => c.case_status === 'in_progress').length,
    resolved: cases.filter(c => c.case_status === 'resolved').length,
    closed: cases.filter(c => c.case_status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Case Management</h1>
          <p className="text-muted-foreground">Track and manage client cases</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Case Title *</Label>
                <Input
                  value={caseForm.case_title}
                  onChange={(e) => setCaseForm({...caseForm, case_title: e.target.value})}
                  placeholder="Brief description of the case"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Case Type</Label>
                  <Select
                    value={caseForm.case_type}
                    onValueChange={(v) => setCaseForm({...caseForm, case_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service_delivery">Service Delivery</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="incident_investigation">Incident Investigation</SelectItem>
                      <SelectItem value="plan_review">Plan Review</SelectItem>
                      <SelectItem value="safeguarding">Safeguarding</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={caseForm.priority}
                    onValueChange={(v) => setCaseForm({...caseForm, priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Assigned Staff</Label>
                <Select
                  value={caseForm.assigned_staff_id}
                  onValueChange={(v) => setCaseForm({...caseForm, assigned_staff_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Opened Date</Label>
                  <Input
                    type="date"
                    value={caseForm.opened_date}
                    onChange={(e) => setCaseForm({...caseForm, opened_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={caseForm.due_date}
                    onChange={(e) => setCaseForm({...caseForm, due_date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={caseForm.case_description}
                  onChange={(e) => setCaseForm({...caseForm, case_description: e.target.value})}
                  rows={4}
                  placeholder="Detailed case description..."
                />
              </div>
              <Button
                onClick={handleCreateCase}
                disabled={!caseForm.case_title || createCaseMutation.isPending}
                className="w-full"
              >
                Create Case
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.open}</p>
                <p className="text-xs text-muted-foreground">Open Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.closed}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Cases</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned Staff</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {practitioners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredCases.map(caseItem => (
          <Card key={caseItem.id} className={caseItem.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{caseItem.case_title}</CardTitle>
                    <Badge variant={
                      caseItem.case_status === 'closed' ? 'secondary' :
                      caseItem.case_status === 'resolved' ? 'default' :
                      caseItem.case_status === 'in_progress' ? 'outline' : 'destructive'
                    }>
                      {caseItem.case_status}
                    </Badge>
                    <Badge variant={caseItem.priority === 'urgent' ? 'destructive' : 'outline'}>
                      {caseItem.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {caseItem.assigned_staff_name || 'Unassigned'}
                    </span>
                    <span>{caseItem.case_number}</span>
                    <span>Opened: {new Date(caseItem.opened_date).toLocaleDateString()}</span>
                    {caseItem.due_date && (
                      <span className={new Date(caseItem.due_date) < new Date() ? 'text-red-600' : ''}>
                        Due: {new Date(caseItem.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSummarizeCase(caseItem.id)}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                  <Select
                    value={caseItem.case_status}
                    onValueChange={(v) => handleUpdateStatus(caseItem.id, v)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">{caseItem.case_description}</p>
              {caseItem.ai_summary && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">AI Summary:</p>
                  <div className="text-sm text-blue-800">
                    {(() => {
                      try {
                        const summary = JSON.parse(caseItem.ai_summary);
                        return <p>{summary.executive_summary}</p>;
                      } catch {
                        return <p>{caseItem.ai_summary}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}