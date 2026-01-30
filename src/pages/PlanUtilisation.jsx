import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  Gauge,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  User,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function PlanUtilisation() {
  const [selectedClient, setSelectedClient] = useState('all');

  const { data: plans = [] } = useQuery({
    queryKey: ['ndisPlans'],
    queryFn: () => base44.entities.NDISPlan.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const filteredPlans = selectedClient === 'all' ? plans : plans.filter(p => p.client_id === selectedClient);

  // Overall Stats
  const totalBudget = filteredPlans.reduce((sum, p) => sum + (p.total_budget || 0), 0);
  const totalUsed = filteredPlans.reduce((sum, p) => sum + (p.total_used || 0), 0);
  const totalRemaining = totalBudget - totalUsed;
  const overallUtilization = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

  // Budget breakdown
  const budgetBreakdown = [
    { name: 'Core', budget: filteredPlans.reduce((sum, p) => sum + (p.core_budget || 0), 0), used: filteredPlans.reduce((sum, p) => sum + (p.core_used || 0), 0), color: COLORS[0] },
    { name: 'Capacity', budget: filteredPlans.reduce((sum, p) => sum + (p.capacity_building_budget || 0), 0), used: filteredPlans.reduce((sum, p) => sum + (p.capacity_building_used || 0), 0), color: COLORS[1] },
    { name: 'Capital', budget: filteredPlans.reduce((sum, p) => sum + (p.capital_budget || 0), 0), used: filteredPlans.reduce((sum, p) => sum + (p.capital_used || 0), 0), color: COLORS[2] },
  ].map(item => ({
    ...item,
    remaining: item.budget - item.used,
    utilization: item.budget > 0 ? (item.used / item.budget) * 100 : 0
  }));

  // Client utilization data for chart
  const clientUtilization = filteredPlans.map(plan => ({
    name: plan.client_name?.split(' ')[0] || 'Unknown',
    budget: (plan.total_budget || 0) / 1000,
    used: (plan.total_used || 0) / 1000,
    utilization: plan.total_budget > 0 ? Math.round((plan.total_used / plan.total_budget) * 100) : 0
  }));

  // Pie chart data
  const pieData = [
    { name: 'Used', value: totalUsed },
    { name: 'Remaining', value: totalRemaining }
  ];

  // Alerts - High utilization or expiring soon
  const alerts = filteredPlans.filter(p => {
    const utilization = p.total_budget > 0 ? (p.total_used / p.total_budget) * 100 : 0;
    const daysToExpiry = p.plan_end_date ? differenceInDays(new Date(p.plan_end_date), new Date()) : 999;
    return utilization > 80 || daysToExpiry <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-teal-600" />
            NDIS Plan Utilisation Tracker
          </h2>
          <p className="text-slate-500 mt-1">Monitor budget usage across clients</p>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">${(totalBudget / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-500">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-teal-600">${(totalUsed / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-500">Total Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600">${(totalRemaining / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-500">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", overallUtilization > 80 ? "bg-red-100" : "bg-amber-100")}>
                <Gauge className={cn("w-5 h-5", overallUtilization > 80 ? "text-red-600" : "text-amber-600")} />
              </div>
              <div>
                <p className={cn("text-xl font-bold", overallUtilization > 80 ? "text-red-600" : "text-amber-600")}>{overallUtilization.toFixed(0)}%</p>
                <p className="text-xs text-slate-500">Utilisation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#14B8A6" />
                  <Cell fill="#E2E8F0" />
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetBreakdown.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate-500">${(item.used / 1000).toFixed(1)}k / ${(item.budget / 1000).toFixed(1)}k ({item.utilization.toFixed(0)}%)</span>
                </div>
                <Progress value={item.utilization} className={cn("h-3", item.utilization > 80 ? "[&>div]:bg-red-500" : `[&>div]:bg-[${item.color}]`)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Client Comparison Chart */}
      {clientUtilization.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Budget Comparison (in thousands)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}k`} />
                <Bar dataKey="budget" name="Budget" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="used" name="Used" fill="#14B8A6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((plan) => {
                const utilization = plan.total_budget > 0 ? (plan.total_used / plan.total_budget) * 100 : 0;
                const daysToExpiry = plan.plan_end_date ? differenceInDays(new Date(plan.plan_end_date), new Date()) : null;
                
                return (
                  <div key={plan.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-slate-900">{plan.client_name}</p>
                        <div className="flex gap-2 text-xs">
                          {utilization > 80 && (
                            <Badge className="bg-red-100 text-red-700">{utilization.toFixed(0)}% used</Badge>
                          )}
                          {daysToExpiry !== null && daysToExpiry <= 30 && (
                            <Badge className="bg-amber-100 text-amber-700">{daysToExpiry} days to expiry</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${(plan.total_used || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">of ${(plan.total_budget || 0).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredPlans.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No NDIS plans to display</p>
          </div>
        </Card>
      )}
    </div>
  );
}