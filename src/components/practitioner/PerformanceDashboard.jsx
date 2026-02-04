import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, Target, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function PerformanceDashboard({ practitionerId }) {
  const { data: practitioner } = useQuery({
    queryKey: ['practitioner', practitionerId],
    queryFn: () => base44.entities.Practitioner.get(practitionerId),
    enabled: !!practitionerId
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['practitionerClients', practitionerId],
    queryFn: () => base44.entities.Client.filter({ assigned_practitioner_id: practitionerId }),
    enabled: !!practitionerId
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['practitionerAppointments', practitionerId],
    queryFn: () => base44.entities.Appointment.filter({ practitioner_id: practitionerId }),
    enabled: !!practitionerId
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['practitionerGoals', practitionerId],
    queryFn: async () => {
      const allGoals = await base44.entities.ClientGoal.list();
      return allGoals.filter(g => clients.some(c => c.id === g.client_id));
    },
    enabled: !!practitionerId && clients.length > 0
  });

  const activeCaseload = clients.filter(c => c.status === 'active').length;
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const appointmentCompletionRate = totalAppointments > 0 
    ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
    : 0;

  const activeGoals = goals.filter(g => ['in_progress', 'on_track'].includes(g.status));
  const achievedGoals = goals.filter(g => g.status === 'achieved');
  const averageGoalProgress = goals.length > 0
    ? (goals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / goals.length).toFixed(1)
    : 0;

  // Monthly appointment trend (last 6 months)
  const getMonthlyTrend = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthAppointments = appointments.filter(a => {
        const apptDate = new Date(a.appointment_date || a.created_date);
        const apptKey = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`;
        return apptKey === monthKey;
      });

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        appointments: monthAppointments.length,
        completed: monthAppointments.filter(a => a.status === 'completed').length
      });
    }
    return months;
  };

  // Client risk distribution
  const getRiskDistribution = () => {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    clients.forEach(c => {
      const level = c.risk_level || 'low';
      distribution[level] = (distribution[level] || 0) + 1;
    });
    return Object.entries(distribution).map(([level, count]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      count
    }));
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Caseload</p>
                <p className="text-3xl font-bold mt-1">{activeCaseload}</p>
              </div>
              <Users className="h-8 w-8 text-teal-600" />
            </div>
            <Progress value={(activeCaseload / 15) * 100} className="mt-3" />
            <p className="text-xs text-slate-500 mt-2">
              {activeCaseload < 12 ? 'Available capacity' : activeCaseload < 15 ? 'Near capacity' : 'At capacity'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Appointment Adherence</p>
                <p className="text-3xl font-bold mt-1">{appointmentCompletionRate}%</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={appointmentCompletionRate} className="mt-3" />
            <p className="text-xs text-slate-500 mt-2">
              {completedAppointments}/{totalAppointments} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Goal Progress</p>
                <p className="text-3xl font-bold mt-1">{averageGoalProgress}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <Progress value={averageGoalProgress} className="mt-3" />
            <p className="text-xs text-slate-500 mt-2">
              {achievedGoals.length} goals achieved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Performance Score</p>
                <p className="text-3xl font-bold mt-1">
                  {Math.round((parseFloat(appointmentCompletionRate) + parseFloat(averageGoalProgress)) / 2)}
                </p>
              </div>
              <Award className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex gap-1 mt-3">
              <Badge className="bg-green-100 text-green-800">On Track</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Appointment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Appointment Activity (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getMonthlyTrend()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="appointments" stroke="#0891b2" name="Scheduled" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Client Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getRiskDistribution()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Client Goals Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activeGoals.slice(0, 10).map(goal => {
              const client = clients.find(c => c.id === goal.client_id);
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{client?.full_name}</p>
                    <p className="text-xs text-slate-600 truncate">{goal.goal_description}</p>
                  </div>
                  <div className="w-32">
                    <Progress value={goal.current_progress || 0} className="h-2" />
                  </div>
                  <Badge variant="outline" className="w-14 justify-center">
                    {goal.current_progress || 0}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}