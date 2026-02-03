import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Shield, FileText, Play, CheckCircle, Loader2 } from 'lucide-react';

export default function ComplianceBreachManagement() {
  const [selectedBreach, setSelectedBreach] = useState(null);
  const [isRunningDetection, setIsRunningDetection] = useState(false);
  const [isDraftingNotice, setIsDraftingNotice] = useState(false);

  const queryClient = useQueryClient();

  const { data: breaches = [] } = useQuery({
    queryKey: ['complianceBreaches'],
    queryFn: () => base44.entities.ComplianceBreach.list('-detected_date'),
  });

  const runDetectionMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('detectComplianceBreaches', {
        date_range_days: 30,
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['complianceBreaches'] });
      alert(`Detection complete: ${data.breaches_detected} potential breaches identified`);
    },
  });

  const draftNoticeMutation = useMutation({
    mutationFn: async (breachId) => {
      const result = await base44.functions.invoke('draftBreachNotice', {
        breach_id: breachId,
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceBreaches'] });
    },
  });

  const handleRunDetection = async () => {
    setIsRunningDetection(true);
    try {
      await runDetectionMutation.mutateAsync();
    } finally {
      setIsRunningDetection(false);
    }
  };

  const handleDraftNotice = async (breachId) => {
    setIsDraftingNotice(true);
    try {
      const result = await draftNoticeMutation.mutateAsync(breachId);
      const breach = breaches.find(b => b.id === breachId);
      setSelectedBreach({ ...breach, notice_content: result.notice_content });
    } finally {
      setIsDraftingNotice(false);
    }
  };

  const highSeverityBreaches = breaches.filter(b => b.severity === 'high' || b.severity === 'critical');
  const pendingReview = breaches.filter(b => b.status === 'identified' || b.status === 'under_review');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Breach Management</h1>
          <p className="text-muted-foreground">Proactive NDIS compliance breach detection and remediation</p>
        </div>
        <Button
          onClick={handleRunDetection}
          disabled={isRunningDetection}
        >
          {isRunningDetection ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Run Detection
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{highSeverityBreaches.length}</p>
                <p className="text-xs text-muted-foreground">High/Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{pendingReview.length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
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
                <p className="text-2xl font-bold text-green-600">
                  {breaches.filter(b => b.status === 'remediated' || b.status === 'closed').length}
                </p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {breaches.map(breach => (
          <Card key={breach.id} className={
            breach.severity === 'critical' || breach.severity === 'high' 
              ? 'border-l-4 border-l-red-500' 
              : 'border-l-4 border-l-orange-500'
          }>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold capitalize">{breach.breach_type.replace(/_/g, ' ')}</h4>
                      <Badge variant={
                        breach.severity === 'critical' || breach.severity === 'high' 
                          ? 'destructive' 
                          : 'secondary'
                      }>
                        {breach.severity}
                      </Badge>
                      <Badge variant="outline">{breach.status}</Badge>
                      {breach.draft_notice_generated && (
                        <Badge variant="default" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          Notice Drafted
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Detected: {new Date(breach.detected_date).toLocaleString()} by {breach.detected_by}
                    </p>
                    <p className="text-sm">{breach.description}</p>
                  </div>
                </div>

                {breach.ndis_clauses && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-xs text-blue-900">
                      <strong>NDIS Reference:</strong> {breach.ndis_clauses}
                    </AlertDescription>
                  </Alert>
                )}

                {breach.required_actions && (
                  <div className="p-3 bg-slate-50 rounded text-xs">
                    <p className="font-medium mb-1">Required Actions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {JSON.parse(breach.required_actions || '[]').map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  {!breach.draft_notice_generated && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDraftNotice(breach.id)}
                      disabled={isDraftingNotice}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Draft Notice
                    </Button>
                  )}
                  {breach.draft_notice_generated && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const fullBreach = breaches.find(b => b.id === breach.id);
                        setSelectedBreach(fullBreach);
                      }}
                    >
                      View Notice
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {breaches.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-muted-foreground">No compliance breaches detected</p>
                <p className="text-sm text-muted-foreground mt-1">Run detection to scan for potential issues</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedBreach && (
        <Dialog open={!!selectedBreach} onOpenChange={() => setSelectedBreach(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Notice of Non-Compliance - {selectedBreach.breach_type.replace(/_/g, ' ')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  This is a draft notice for internal review. Requires management approval before sending.
                </AlertDescription>
              </Alert>
              <div className="p-4 bg-slate-50 rounded border">
                <pre className="whitespace-pre-wrap text-sm font-sans">{selectedBreach.notice_content}</pre>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedBreach(null)}>
                  Close
                </Button>
                <Button disabled>
                  Approve & Send (Coming Soon)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}