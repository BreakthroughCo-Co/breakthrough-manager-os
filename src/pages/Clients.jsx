import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  Edit,
  Trash2,
  User,
  FileText,
  Mail,
  Eye
} from 'lucide-react';
import ClientCommunicationTemplates from '@/components/communication/ClientCommunicationTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const emptyClient = {
  full_name: '',
  ndis_number: '',
  date_of_birth: '',
  primary_contact_name: '',
  primary_contact_phone: '',
  primary_contact_email: '',
  assigned_practitioner_id: '',
  plan_start_date: '',
  plan_end_date: '',
  funding_allocated: 0,
  funding_utilised: 0,
  status: 'active',
  service_type: 'Behaviour Support',
  risk_level: 'low',
  notes: ''
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  waitlist: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  discharged: 'bg-slate-100 text-slate-700',
  plan_review: 'bg-purple-100 text-purple-700',
};

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(emptyClient);
  const [communicationClient, setCommunicationClient] = useState(null);

  const queryClient = useQueryClient();

  // Check URL params for action
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsDialogOpen(true);
    }
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData(emptyClient);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData(emptyClient);
  };

  const handleSubmit = () => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ndis_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPlanDaysRemaining = (endDate) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  const getPractitionerName = (id) => {
    const practitioner = practitioners.find(p => p.id === id);
    return practitioner?.full_name || 'Unassigned';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
          <p className="text-slate-500 mt-1">Manage NDIS participants and their plans</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or NDIS number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="plan_review">Plan Review</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Client</TableHead>
              <TableHead>NDIS Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Practitioner</TableHead>
              <TableHead>Funding</TableHead>
              <TableHead>Plan Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => {
              const daysRemaining = getPlanDaysRemaining(client.plan_end_date);
              const fundingPercent = client.funding_allocated > 0 
                ? (client.funding_utilised / client.funding_allocated) * 100 
                : 0;
              
              return (
                <TableRow key={client.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.full_name}</p>
                        <p className="text-xs text-slate-500">{client.service_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{client.ndis_number}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.status]}>
                      {client.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {getPractitionerName(client.assigned_practitioner_id)}
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">${(client.funding_utilised || 0).toLocaleString()}</span>
                        <span className="text-slate-400">${(client.funding_allocated || 0).toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={fundingPercent} 
                        className={cn(
                          "h-1.5",
                          fundingPercent > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-teal-500"
                        )}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {daysRemaining !== null && (
                      <div className={cn(
                        "flex items-center gap-1 text-sm",
                        daysRemaining <= 14 ? "text-red-600" : 
                        daysRemaining <= 30 ? "text-amber-600" : "text-slate-600"
                      )}>
                        {daysRemaining <= 14 && <AlertCircle className="w-3 h-3" />}
                        <span>{daysRemaining} days</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(client)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCommunicationClient(client)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Communication
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(client.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredClients.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No clients found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>NDIS Number *</Label>
              <Input
                value={formData.ndis_number}
                onChange={(e) => setFormData({ ...formData, ndis_number: e.target.value })}
                placeholder="NDIS participant number"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Service Type</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => setFormData({ ...formData, service_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Behaviour Support">Behaviour Support</SelectItem>
                  <SelectItem value="LEGO Therapy">LEGO Therapy</SelectItem>
                  <SelectItem value="Capacity Building">Capacity Building</SelectItem>
                  <SelectItem value="Combined">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Primary Contact</h4>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Contact Name</Label>
              <Input
                value={formData.primary_contact_name}
                onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                placeholder="Guardian/contact name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Contact Phone</Label>
              <Input
                value={formData.primary_contact_phone}
                onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="col-span-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.primary_contact_email}
                onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Plan Details</h4>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Assigned Practitioner</Label>
              <Select
                value={formData.assigned_practitioner_id}
                onValueChange={(value) => setFormData({ ...formData, assigned_practitioner_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select practitioner" />
                </SelectTrigger>
                <SelectContent>
                  {practitioners.filter(p => p.status === 'active').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="plan_review">Plan Review</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Plan Start Date</Label>
              <Input
                type="date"
                value={formData.plan_start_date}
                onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Plan End Date</Label>
              <Input
                type="date"
                value={formData.plan_end_date}
                onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Funding Allocated ($)</Label>
              <Input
                type="number"
                value={formData.funding_allocated}
                onChange={(e) => setFormData({ ...formData, funding_allocated: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Funding Utilised ($)</Label>
              <Input
                type="number"
                value={formData.funding_utilised}
                onChange={(e) => setFormData({ ...formData, funding_utilised: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Risk Level</Label>
              <Select
                value={formData.risk_level}
                onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.full_name || !formData.ndis_number}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingClient ? 'Update' : 'Create'} Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Templates Dialog */}
      <ClientCommunicationTemplates
        client={communicationClient}
        isOpen={!!communicationClient}
        onClose={() => setCommunicationClient(null)}
      />
    </div>
  );
}