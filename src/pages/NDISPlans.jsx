import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  User,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const emptyPlan = {
  client_id: '',
  client_name: '',
  plan_number: '',
  plan_start_date: '',
  plan_end_date: '',
  plan_manager: 'plan_managed',
  plan_manager_name: '',
  core_budget: 0,
  core_used: 0,
  capacity_building_budget: 0,
  capacity_building_used: 0,
  capital_budget: 0,
  capital_used: 0,
  behaviour_support_budget: 0,
  behaviour_support_used: 0,
  total_budget: 0,
  total_used: 0,
  stated_goals: '',
  support_coordinator: '',
  support_coordinator_contact: '',
  status: 'active',
  notes: ''
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  under_review: 'bg-blue-100 text-blue-700',
};

export default function NDISPlans() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(emptyPlan);

  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['ndisPlans'],
    queryFn: () => base44.entities.NDISPlan.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NDISPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndisPlans'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NDISPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ndisPlans'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NDISPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ndisPlans'] }),
  });

  const handleOpenDialog = (plan = null) => {
    if (plan) { setEditingPlan(plan); setFormData(plan); }
    else { setEditingPlan(null); setFormData(emptyPlan); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingPlan(null); setFormData(emptyPlan); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const calculateTotals = (data) => {
    const total_budget = (parseFloat(data.core_budget) || 0) + (parseFloat(data.capacity_building_budget) || 0) + (parseFloat(data.capital_budget) || 0);
    const total_used = (parseFloat(data.core_used) || 0) + (parseFloat(data.capacity_building_used) || 0) + (parseFloat(data.capital_used) || 0);
    return { total_budget, total_used };
  };

  const handleBudgetChange = (field, value) => {
    const updated = { ...formData, [field]: parseFloat(value) || 0 };
    const totals = calculateTotals(updated);
    setFormData({ ...updated, ...totals });
  };

  const handleSubmit = () => {
    const totals = calculateTotals(formData);
    if (editingPlan) updateMutation.mutate({ id: editingPlan.id, data: { ...formData, ...totals } });
    else createMutation.mutate({ ...formData, ...totals });
  };

  // Stats
  const totalBudget = plans.reduce((sum, p) => sum + (p.total_budget || 0), 0);
  const totalUsed = plans.reduce((sum, p) => sum + (p.total_used || 0), 0);
  const activePlans = plans.filter(p => {
    const days = p.plan_end_date ? differenceInDays(new Date(p.plan_end_date), new Date()) : 999;
    return days > 30;
  }).length;
  const expiringSoon = plans.filter(p => {
    const days = p.plan_end_date ? differenceInDays(new Date(p.plan_end_date), new Date()) : 999;
    return days > 0 && days <= 30;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            NDIS Plan Analyser
          </h2>
          <p className="text-slate-500 mt-1">Input and analyse NDIS plan budgets</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{plans.length}</p>
            <p className="text-xs text-slate-500">Total Plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-emerald-600">{activePlans}</p>
            <p className="text-xs text-slate-500">Active</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
            <p className="text-xs text-amber-700">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-600">${(totalBudget / 1000).toFixed(0)}k</p>
            <p className="text-xs text-slate-500">Total Budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const daysToExpiry = plan.plan_end_date ? differenceInDays(new Date(plan.plan_end_date), new Date()) : null;
          const utilization = plan.total_budget > 0 ? (plan.total_used / plan.total_budget) * 100 : 0;
          
          return (
            <Card key={plan.id} className="hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{plan.client_name || 'Unknown'}</h4>
                      <p className="text-xs text-slate-500">Plan: {plan.plan_number || '-'}</p>
                    </div>
                  </div>
                  {daysToExpiry !== null && (
                    <Badge className={cn(daysToExpiry < 0 ? 'bg-red-100 text-red-700' : daysToExpiry <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                      {daysToExpiry < 0 ? 'Expired' : daysToExpiry <= 30 ? `${daysToExpiry}d left` : 'Active'}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Budget</span>
                    <span className="font-medium">${(plan.total_budget || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Used</span>
                    <span className="font-medium">${(plan.total_used || 0).toLocaleString()}</span>
                  </div>
                  <Progress value={utilization} className={cn("h-2", utilization > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-teal-500")} />
                  <p className="text-xs text-slate-400 text-right">{utilization.toFixed(0)}% utilised</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-500">Core</p>
                    <p className="font-medium">${((plan.core_budget || 0) / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-500">Capacity</p>
                    <p className="font-medium">${((plan.capacity_building_budget || 0) / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-500">Capital</p>
                    <p className="font-medium">${((plan.capital_budget || 0) / 1000).toFixed(1)}k</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(plan)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(plan.id)} className="text-red-600">
                    <Trash2 className="w-3 h-3 mr-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No NDIS plans added yet</p>
          </div>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit NDIS Plan' : 'Add NDIS Plan'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Number</Label>
                <Input value={formData.plan_number} onChange={(e) => setFormData({ ...formData, plan_number: e.target.value })} />
              </div>
              <div>
                <Label>Plan Start Date *</Label>
                <Input type="date" value={formData.plan_start_date} onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })} />
              </div>
              <div>
                <Label>Plan End Date *</Label>
                <Input type="date" value={formData.plan_end_date} onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })} />
              </div>
              <div>
                <Label>Plan Management</Label>
                <Select value={formData.plan_manager} onValueChange={(v) => setFormData({ ...formData, plan_manager: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self_managed">Self Managed</SelectItem>
                    <SelectItem value="plan_managed">Plan Managed</SelectItem>
                    <SelectItem value="ndia_managed">NDIA Managed</SelectItem>
                    <SelectItem value="combination">Combination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Manager Name</Label>
                <Input value={formData.plan_manager_name} onChange={(e) => setFormData({ ...formData, plan_manager_name: e.target.value })} />
              </div>
            </div>

            {/* Budget Inputs */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-blue-900">Budget Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Core Supports Budget ($)</Label>
                  <Input type="number" value={formData.core_budget} onChange={(e) => handleBudgetChange('core_budget', e.target.value)} />
                </div>
                <div>
                  <Label>Core Used ($)</Label>
                  <Input type="number" value={formData.core_used} onChange={(e) => handleBudgetChange('core_used', e.target.value)} />
                </div>
                <div>
                  <Label>Capacity Building Budget ($)</Label>
                  <Input type="number" value={formData.capacity_building_budget} onChange={(e) => handleBudgetChange('capacity_building_budget', e.target.value)} />
                </div>
                <div>
                  <Label>Capacity Building Used ($)</Label>
                  <Input type="number" value={formData.capacity_building_used} onChange={(e) => handleBudgetChange('capacity_building_used', e.target.value)} />
                </div>
                <div>
                  <Label>Capital Budget ($)</Label>
                  <Input type="number" value={formData.capital_budget} onChange={(e) => handleBudgetChange('capital_budget', e.target.value)} />
                </div>
                <div>
                  <Label>Capital Used ($)</Label>
                  <Input type="number" value={formData.capital_used} onChange={(e) => handleBudgetChange('capital_used', e.target.value)} />
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="font-medium text-blue-900">Total Budget:</span>
                <span className="text-xl font-bold text-blue-600">${formData.total_budget?.toLocaleString() || 0}</span>
              </div>
            </div>

            <div>
              <Label>Behaviour Support Budget ($)</Label>
              <Input type="number" value={formData.behaviour_support_budget} onChange={(e) => setFormData({ ...formData, behaviour_support_budget: parseFloat(e.target.value) || 0 })} />
            </div>

            <div>
              <Label>Stated Goals</Label>
              <Textarea value={formData.stated_goals} onChange={(e) => setFormData({ ...formData, stated_goals: e.target.value })} placeholder="NDIS plan stated goals..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Support Coordinator</Label>
                <Input value={formData.support_coordinator} onChange={(e) => setFormData({ ...formData, support_coordinator: e.target.value })} />
              </div>
              <div>
                <Label>Coordinator Contact</Label>
                <Input value={formData.support_coordinator_contact} onChange={(e) => setFormData({ ...formData, support_coordinator_contact: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id || !formData.plan_start_date} className="bg-teal-600 hover:bg-teal-700">
              {editingPlan ? 'Update' : 'Save'} Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}