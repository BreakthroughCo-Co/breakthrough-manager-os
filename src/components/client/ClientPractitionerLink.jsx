import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import PractitionerCaseloadIndicator from '@/components/practitioner/PractitionerCaseloadIndicator';

export default function ClientPractitionerLink({ clientId, currentPractitionerId = null, onPractitionerChange = null }) {
  const queryClient = useQueryClient();
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(currentPractitionerId || '');
  const [isChanging, setIsChanging] = useState(false);

  const { data: practitioners, isLoading: practLoadingLoading } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const updateMutation = useMutation({
    mutationFn: (practitionerId) =>
      base44.entities.Client.update(clientId, { assigned_practitioner_id: practitionerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientDetail', clientId] });
      if (onPractitionerChange) onPractitionerChange(selectedPractitionerId);
      setIsChanging(false);
    }
  });

  const handleAssignPractitioner = async () => {
    if (selectedPractitionerId) {
      updateMutation.mutate(selectedPractitionerId);
    }
  };

  const currentPractitioner = practitioners?.find(p => p.id === (currentPractitionerId || selectedPractitionerId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Primary Practitioner Assignment</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentPractitioner && !isChanging && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Currently Assigned</p>
                <p className="text-lg font-semibold text-blue-900">{currentPractitioner.full_name}</p>
                {currentPractitioner.specialisation && (
                  <Badge className="mt-2">{currentPractitioner.specialisation}</Badge>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setIsChanging(true)}
                disabled={updateMutation.isPending}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {isChanging && (
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
            <p className="text-sm font-medium">Select a practitioner to assign</p>
            <Select value={selectedPractitionerId} onValueChange={setSelectedPractitionerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose practitioner..." />
              </SelectTrigger>
              <SelectContent>
                {practitioners?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center justify-between w-full pr-6">
                      <span>{p.full_name} {p.specialisation ? `(${p.specialisation})` : ''}</span>
                      <PractitionerCaseloadIndicator practitionerId={p.id} compact />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPractitionerId && (
              <div className="mt-3 p-3 bg-white rounded-lg border">
                <PractitionerCaseloadIndicator practitionerId={selectedPractitionerId} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsChanging(false);
                  setSelectedPractitionerId(currentPractitionerId || '');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPractitioner}
                disabled={!selectedPractitionerId || updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </div>
          </div>
        )}

        {!currentPractitioner && !isChanging && (
          <Alert>
            <AlertTitle>No practitioner assigned yet</AlertTitle>
            <Button
              onClick={() => setIsChanging(true)}
              className="mt-3"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Practitioner
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}