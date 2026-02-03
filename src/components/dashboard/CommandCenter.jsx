import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Users, Shield, TrendingUp, Eye } from 'lucide-react';

export default function CommandCenter() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setUserRole(userData.role || 'user');
      } catch (e) {
        console.error('User load failed:', e);
      }
    };
    loadUser();
  }, []);

  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.filter({ status: 'action_required' }, '-incident_date', 20)
  });

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: complianceItems } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.filter({ status: 'overdue' })
  });

  // Role-based view mapping
  const roleViews = {
    admin: ['Overview', 'Operational', 'Compliance', 'Analytics'],
    manager: ['Overview', 'Team', 'Clients', 'Incidents'],
    practitioner: ['Cases', 'Incidents', 'Goals', 'Support'],
    provider: ['Audit', 'Compliance', 'Reports']
  };

  const currentTabs = roleViews[userRole] || roleViews.user;

  const roleColors = {
    admin: 'text-purple-600 bg-purple-50',
    manager: 'text-blue-600 bg-blue-50',
    practitioner: 'text-teal-600 bg-teal-50',
    provider: 'text-slate-600 bg-slate-50'
  };

  return (
    <div className="space-y-6">
      {/* Role Indicator */}
      <div className={`p-4 rounded-lg ${roleColors[userRole]} border`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Breakthrough Command Center</h2>
            <p className="text-sm opacity-80">Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</p>
          </div>
          <Badge>{userRole}</Badge>
        </div>
      </div>

      <Tabs defaultValue={currentTabs[0]} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${currentTabs.length}, 1fr)` }}>
          {currentTabs.map(tab => (
            <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
          ))}
        </TabsList>

        {/* ADMIN VIEW */}
        {userRole === 'admin' && (
          <>
            <TabsContent value="Overview" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Active Practitioners</div>
                    <div className="text-3xl font-bold mt-2">{practitioners?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Active Clients</div>
                    <div className="text-3xl font-bold mt-2">{clients?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Critical Incidents</div>
                    <div className="text-3xl font-bold mt-2 text-red-600">
                      {incidents?.filter(i => i.severity === 'critical').length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Compliance Overdue</div>
                    <div className="text-3xl font-bold mt-2 text-orange-600">
                      {complianceItems?.length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="Operational" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Operational Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{incidents?.length || 0} Incidents Requiring Action</AlertTitle>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Oversight</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Compliance monitoring and audit readiness dashboard for administrators.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strategic Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">System-wide analytics, trends, and predictive insights for strategic planning.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {/* MANAGER VIEW */}
        {userRole === 'manager' && (
          <>
            <TabsContent value="Overview" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Team Size</div>
                    <div className="text-3xl font-bold mt-2">{practitioners?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Caseload</div>
                    <div className="text-3xl font-bold mt-2">{clients?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-slate-600">Incidents (30d)</div>
                    <div className="text-3xl font-bold mt-2 text-orange-600">{incidents?.length || 0}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="Team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Practitioner Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Team oversight, performance metrics, and development tracking.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Clients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Caseload Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Client overview, progress monitoring, and support plan adherence.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Incidents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Risk monitoring, incident investigation, and prevention tracking.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {/* PRACTITIONER VIEW */}
        {userRole === 'practitioner' && (
          <>
            <TabsContent value="Cases" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Personal caseload and client progress tracking.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Incidents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Reporting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Report incidents, access support, and track safety concerns.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Goals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Goal tracking, progress updates, and outcome monitoring.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Support" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Support & Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Access training, guidance, and clinical support tools.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {/* PROVIDER VIEW (Audit/Read-only) */}
        {userRole === 'provider' && (
          <>
            <TabsContent value="Audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Audit View (Read-Only)
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Review support plan adherence and service delivery metrics.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">View compliance status for contracted services.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Access service delivery reports and performance summaries.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}