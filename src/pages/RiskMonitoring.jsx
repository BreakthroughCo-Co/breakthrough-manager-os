import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Users, 
  User, 
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RiskMonitoring() {
  const [filter, setFilter] = useState('active');
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['riskAlerts', filter],
    queryFn: async () => {
      const allAlerts = await base44.entities.RiskAlert.list('-created_date');
      return filter === 'all' 
        ? allAlerts 
        : allAlerts.filter(a => a.status === filter);
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId) => {
      const user = await base44.auth.me();
      return base44.entities.RiskAlert.update(alertId, {
        status: 'acknowledged',
        acknowledged_by: user.email,
        acknowledged_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['riskAlerts']);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, notes }) => {
      return base44.entities.RiskAlert.update(alertId, {
        status: 'resolved',
        resolution_notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['riskAlerts']);
    },
  });

  const participantAlerts = alerts.filter(a => a.alert_type === 'participant_risk');
  const practitionerAlerts = alerts.filter(a => a.alert_type === 'practitioner_flag');
  const orgAlerts = alerts.filter(a => a.alert_type === 'organisational_risk');

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const AlertCard = ({ alert }) => {
    const metrics = alert.metrics ? JSON.parse(alert.metrics) : {};
    const flags = alert.flags ? JSON.parse(alert.flags) : [];
    const recommendations = alert.recommendations ? JSON.parse(alert.recommendations) : [];

    return (
      <Card className={`border-l-4 ${getRiskColor(alert.risk_level)}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{alert.entity_name}</CardTitle>
                <Badge className={getRiskColor(alert.risk_level)}>
                  {alert.risk_level}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Score: {alert.risk_score}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {alert.alert_category.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex gap-2">
              {alert.status === 'active' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => resolveMutation.mutate({ alertId: alert.id, notes: 'Resolved via dashboard' })}
                  >
                    Resolve
                  </Button>
                </>
              )}
              {alert.status === 'acknowledged' && (
                <Badge variant="outline" className="bg-blue-50">
                  Acknowledged by {alert.acknowledged_by}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Risk Flags:</p>
              <ul className="list-disc list-inside space-y-1">
                {flags.map((flag, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>
                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                <span className="ml-2 font-medium">{value}</span>
              </div>
            ))}
          </div>

          {recommendations.length > 0 && (
            <div className="bg-blue-50 rounded p-3 border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-1">Recommendations:</p>
              <ul className="list-disc list-inside space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-blue-800">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Generated: {new Date(alert.created_date).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Risk Monitoring</h1>
          <p className="text-muted-foreground">Clinical risk early-warning system</p>
        </div>
        <Button variant="outline" asChild>
          <Link to={createPageUrl('HybridIntelligence')}>
            <TrendingUp className="w-4 h-4 mr-2" />
            View Intelligence
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{urgentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.filter(a => a.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Monitored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'acknowledged' ? 'default' : 'outline'}
          onClick={() => setFilter('acknowledged')}
        >
          Acknowledged
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
        >
          Resolved
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants">
            <Users className="w-4 h-4 mr-2" />
            Participants ({participantAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="practitioners">
            <User className="w-4 h-4 mr-2" />
            Practitioners ({practitionerAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="organisation">
            <Building2 className="w-4 h-4 mr-2" />
            Organisation ({orgAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          {participantAlerts.length === 0 ? (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription>No participant risk alerts</AlertDescription>
            </Alert>
          ) : (
            participantAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="practitioners" className="space-y-4">
          {practitionerAlerts.length === 0 ? (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription>No practitioner risk flags</AlertDescription>
            </Alert>
          ) : (
            practitionerAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="organisation" className="space-y-4">
          {orgAlerts.length === 0 ? (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription>No organisational risk indicators</AlertDescription>
            </Alert>
          ) : (
            orgAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}