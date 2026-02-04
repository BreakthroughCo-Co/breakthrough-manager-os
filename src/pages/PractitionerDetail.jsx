import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  Target,
  AlertCircle,
  DollarSign,
  Edit,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import MessageComposer from '@/components/communication/MessageComposer';
import PerformanceInsightsPanel from '@/components/practitioner/PerformanceInsightsPanel';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  probation: 'bg-blue-100 text-blue-700',
  inactive: 'bg-slate-100 text-slate-700',
};

const clientStatusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  waitlist: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  discharged: 'bg-slate-100 text-slate-700',
  plan_review: 'bg-purple-100 text-purple-700',
};

export default function PractitionerDetail() {
  const [practitionerId, setPractitionerId] = useState(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPractitionerId(params.get('id'));
    
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: practitioner } = useQuery({
    queryKey: ['practitioner', practitionerId],
    queryFn: async () => {
      const practitioners = await base44.entities.Practitioner.list();
      return practitioners.find(p => p.id === practitionerId);
    },
    enabled: !!practitionerId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list(),
  });

  const { data: allPractitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  if (!practitioner) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading practitioner details...</p>
      </div>
    );
  }

  // Get assigned clients
  const assignedClients = clients.filter(c => c.assigned_practitioner_id === practitionerId);
  
  // Calculate metrics
  const caseloadPercent = practitioner.caseload_capacity 
    ? (assignedClients.length / practitioner.caseload_capacity) * 100 
    : 0;
  
  const billablePercent = practitioner.billable_hours_target 
    ? ((practitioner.billable_hours_actual || 0) / practitioner.billable_hours_target) * 100 
    : 0;

  // Get practitioner's billing records
  const practitionerBilling = billingRecords.filter(r => r.practitioner_id === practitionerId);
  const totalBilled = practitionerBilling.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Practitioners')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{practitioner.full_name}</h2>
          <p className="text-slate-500">{practitioner.role}</p>
        </div>
        <Button variant="outline" onClick={() => setIsMessageOpen(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Message
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{assignedClients.length}</p>
                <p className="text-xs text-slate-500">Active Clients</p>
              </div>
            </div>
            <Progress 
              value={caseloadPercent} 
              className={cn("mt-3 h-2", caseloadPercent > 90 ? "[&>div]:bg-red-500" : "[&>div]:bg-teal-500")} 
            />
            <p className="text-xs text-slate-400 mt-1">
              {assignedClients.length} / {practitioner.caseload_capacity || 0} capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{practitioner.billable_hours_actual || 0}h</p>
                <p className="text-xs text-slate-500">Billable Hours</p>
              </div>
            </div>
            <Progress 
              value={billablePercent} 
              className={cn("mt-3 h-2", billablePercent < 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-purple-500")} 
            />
            <p className="text-xs text-slate-400 mt-1">
              {Math.round(billablePercent)}% of {practitioner.billable_hours_target || 0}h target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${totalBilled.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Billed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Badge className={cn("mb-2", statusColors[practitioner.status])}>
              {practitioner.status?.replace(/_/g, ' ')}
            </Badge>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{practitioner.email}</span>
              </div>
              {practitioner.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{practitioner.phone}</span>
                </div>
              )}
              {practitioner.start_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Since {format(new Date(practitioner.start_date), 'MMM yyyy')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <PerformanceInsightsPanel practitionerId={practitionerId} />

      {/* Caseload Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Caseload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedClients.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No clients assigned</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funding Utilization</TableHead>
                  <TableHead>Plan End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedClients.map((client) => {
                  const fundingPercent = client.funding_allocated 
                    ? (client.funding_utilised / client.funding_allocated) * 100 
                    : 0;
                  const daysRemaining = client.plan_end_date 
                    ? differenceInDays(new Date(client.plan_end_date), new Date()) 
                    : null;
                  
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{client.full_name}</p>
                            <p className="text-xs text-slate-500">{client.ndis_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{client.service_type}</TableCell>
                      <TableCell>
                        <Badge className={clientStatusColors[client.status]}>
                          {client.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{Math.round(fundingPercent)}%</span>
                          </div>
                          <Progress 
                            value={fundingPercent} 
                            className={cn("h-1.5", fundingPercent > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-teal-500")} 
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
                            {daysRemaining <= 30 && <AlertCircle className="w-3 h-3" />}
                            <span>{daysRemaining} days</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Message Composer */}
      <MessageComposer
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
        practitioners={allPractitioners}
        currentUser={currentUser}
        defaultRecipient={practitioner}
      />
    </div>
  );
}