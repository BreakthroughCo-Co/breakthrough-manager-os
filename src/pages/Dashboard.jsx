import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Users,
  UserCheck,
  DollarSign,
  Shield,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Clock
} from 'lucide-react';

import StatsCard from '@/components/dashboard/StatsCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import FundingOverview from '@/components/dashboard/FundingOverview';
import PractitionerMetrics from '@/components/dashboard/PractitionerMetrics';

export default function Dashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.list(),
  });

  const { data: billingRecords = [] } = useQuery({
    queryKey: ['billing'],
    queryFn: () => base44.entities.BillingRecord.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  // Calculate metrics
  const activeClients = clients.filter(c => c.status === 'active').length;
  const activePractitioners = practitioners.filter(p => p.status === 'active').length;
  
  // Monthly revenue
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthlyBilling = billingRecords
    .filter(b => {
      const date = new Date(b.service_date);
      return date >= monthStart && date <= monthEnd && b.status === 'paid';
    })
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Compliance alerts
  const complianceAlerts = complianceItems
    .filter(item => {
      if (item.status === 'non_compliant') return true;
      if (item.status === 'attention_needed') return true;
      if (item.due_date && differenceInDays(new Date(item.due_date), new Date()) <= 14) return true;
      return false;
    });

  // Client plan review alerts
  const planReviewAlerts = clients
    .filter(c => {
      if (!c.plan_end_date) return false;
      const daysUntilEnd = differenceInDays(new Date(c.plan_end_date), new Date());
      return daysUntilEnd <= 30 && daysUntilEnd > 0;
    });

  // Combine alerts
  const alerts = [
    ...complianceAlerts.map(item => ({
      type: 'compliance',
      title: item.title,
      description: `Status: ${item.status?.replace(/_/g, ' ')}`,
      priority: item.priority || 'medium',
      dueDate: item.due_date
    })),
    ...planReviewAlerts.map(client => ({
      type: 'client',
      title: `Plan Review: ${client.full_name}`,
      description: `Plan ending ${format(new Date(client.plan_end_date), 'MMM d, yyyy')}`,
      priority: differenceInDays(new Date(client.plan_end_date), new Date()) <= 14 ? 'high' : 'medium',
      dueDate: client.plan_end_date
    }))
  ].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });

  // Recent activity mock (in production, this would come from an activity log entity)
  const recentActivities = [
    ...billingRecords.slice(0, 3).map(b => ({
      type: 'billing_submitted',
      description: `Billing record for ${b.client_name || 'client'} - $${b.total_amount?.toFixed(2)}`,
      timestamp: b.created_date
    })),
    ...tasks.filter(t => t.status === 'completed').slice(0, 2).map(t => ({
      type: 'task_completed',
      description: `Task completed: ${t.title}`,
      timestamp: t.updated_date
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);

  // Pending tasks count
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Good {getGreeting()}</h2>
          <p className="text-slate-500 mt-1">Here's your operational overview for {format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Clients"
          value={activeClients}
          subtitle={`${clients.filter(c => c.status === 'waitlist').length} on waitlist`}
          icon={Users}
          trend={5}
          variant="teal"
        />
        <StatsCard
          title="Active Practitioners"
          value={activePractitioners}
          subtitle="Team members"
          icon={UserCheck}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${monthlyBilling.toLocaleString()}`}
          subtitle="This month"
          icon={DollarSign}
          trend={12}
          variant="purple"
        />
        <StatsCard
          title="Pending Tasks"
          value={pendingTasks}
          subtitle="Requiring attention"
          icon={Clock}
          variant={pendingTasks > 10 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2 cols wide */}
        <div className="lg:col-span-2 space-y-6">
          <PractitionerMetrics practitioners={practitioners} />
          <FundingOverview clients={clients} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions />
          <AlertsPanel alerts={alerts} />
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}