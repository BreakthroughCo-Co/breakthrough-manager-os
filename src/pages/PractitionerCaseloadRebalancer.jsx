import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Users, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';

export default function PractitionerCaseloadRebalancer() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState(null);
  const [targetPractitioner, setTargetPractitioner] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ clientId, practitionerId, practitionerName }) =>
      base44.entities.Client.update(clientId, {
        assigned_practitioner_id: practitionerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClient(null);
      setTargetPractitioner('');
    },
  });

  // Build caseload map: practitioner id → list of clients
  const caseloadMap = useMemo(() => {
    const map = {};
    practitioners.forEach(p => { map[p.id] = []; });
    clients.forEach(c => {
      if (c.assigned_practitioner_id) {
        if (!map[c.assigned_practitioner_id]) map[c.assigned_practitioner_id] = [];
        map[c.assigned_practitioner_id].push(c);
      }
    });
    return map;
  }, [practitioners, clients]);

  const getCapacityStatus = (practitioner) => {
    const count = caseloadMap[practitioner.id]?.length || 0;
    const capacity = practitioner.caseload_capacity || 15;
    const pct = (count / capacity) * 100;
    if (pct >= 90) return { label: 'At Capacity', color: 'text-red-600', bg: 'bg-red-100' };
    if (pct >= 75) return { label: 'Near Capacity', color: 'text-amber-600', bg: 'bg-amber-100' };
    if (pct <= 40) return { label: 'Underutilised', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { label: 'Balanced', color: 'text-emerald-600', bg: 'bg-emerald-100' };
  };

  const handleReassign = async () => {
    if (!selectedClient || !targetPractitioner) return;
    const pract = practitioners.find(p => p.id === targetPractitioner);
    await reassignMutation.mutateAsync({
      clientId: selectedClient.id,
      practitionerId: targetPractitioner,
      practitionerName: pract?.full_name,
    });
  };

  const activePractitioners = practitioners.filter(p => p.status === 'active');

  return (
    <div className={cn("space-y-6", isDark ? "text-slate-50" : "text-slate-900")}>
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-teal-600" />
          Caseload Rebalancer
        </h2>
        <p className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
          Reassign clients across practitioners with real-time capacity visibility
        </p>
      </div>

      {/* Capacity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePractitioners.map(p => {
          const caseload = caseloadMap[p.id] || [];
          const capacity = p.caseload_capacity || 15;
          const pct = Math.min((caseload.length / capacity) * 100, 100);
          const status = getCapacityStatus(p);

          return (
            <Card key={p.id} className={cn(
              "transition-all",
              isDark ? "bg-slate-800 border-slate-700" : "bg-white"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.full_name}</CardTitle>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>{p.role}</p>
                  </div>
                  <Badge className={cn("text-xs", status.bg, status.color, "border-0")}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Capacity bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{caseload.length} clients</span>
                    <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>
                      cap: {capacity}
                    </span>
                  </div>
                  <div className={cn("h-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-200")}>
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        pct >= 90 ? "bg-red-500" :
                        pct >= 75 ? "bg-amber-500" :
                        pct <= 40 ? "bg-blue-400" :
                        "bg-emerald-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Client list */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {caseload.length === 0 && (
                    <p className={cn("text-xs text-center py-2", isDark ? "text-slate-500" : "text-slate-400")}>No assigned clients</p>
                  )}
                  {caseload.map(client => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-colors",
                        selectedClient?.id === client.id
                          ? "bg-teal-100 text-teal-900"
                          : isDark
                            ? "hover:bg-slate-700 text-slate-300"
                            : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <span className="font-medium truncate">{client.full_name}</span>
                      <Badge className={cn(
                        "text-xs ml-1 border-0 flex-shrink-0",
                        client.risk_level === 'high' ? "bg-red-100 text-red-700" :
                        client.risk_level === 'medium' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {client.risk_level || 'low'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reassignment Panel */}
      {selectedClient && (
        <Card className={cn(
          "border-teal-300",
          isDark ? "bg-slate-800 border-slate-700" : "bg-teal-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-teal-600" />
              Reassign: <span className="text-teal-700">{selectedClient.full_name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select value={targetPractitioner} onValueChange={setTargetPractitioner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new practitioner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePractitioners
                      .filter(p => p.id !== selectedClient.assigned_practitioner_id)
                      .map(p => {
                        const count = caseloadMap[p.id]?.length || 0;
                        const cap = p.caseload_capacity || 15;
                        const status = getCapacityStatus(p);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name} — {count}/{cap} clients ({status.label})
                          </SelectItem>
                        );
                      })
                    }
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleReassign}
                disabled={!targetPractitioner || reassignMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {reassignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Reassignment
              </Button>
              <Button variant="outline" onClick={() => { setSelectedClient(null); setTargetPractitioner(''); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedClient && (
        <p className={cn("text-sm text-center", isDark ? "text-slate-500" : "text-slate-400")}>
          Click a client name in any practitioner card to initiate a reassignment
        </p>
      )}
    </div>
  );
}