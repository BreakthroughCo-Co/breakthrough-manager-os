import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PractitionerSessionFeedback from '@/components/practitioner/PractitionerSessionFeedback';
import { AlertCircle } from 'lucide-react';

export default function PractitionerPerformance() {
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(null);

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners_for_feedback'],
    queryFn: async () => {
      const data = await base44.entities.Practitioner.list();
      return data?.filter(p => p.status === 'active').sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
      ) || [];
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practitioner Performance</h1>
        <p className="text-slate-600 mt-2">Personalized session feedback and development insights</p>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI analyzes session delivery, client engagement, documentation quality, and support plan adherence to provide constructive, actionable feedback for each practitioner.
        </AlertDescription>
      </Alert>

      {/* Practitioner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Practitioner</CardTitle>
          <CardDescription>View performance feedback and development recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPractitionerId || ''} onValueChange={setSelectedPractitionerId}>
            <SelectTrigger>
              <SelectValue placeholder="Search practitioners..." />
            </SelectTrigger>
            <SelectContent>
              {practitioners?.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} - {p.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Feedback Display */}
      {selectedPractitionerId && (
        <PractitionerSessionFeedback practitionerId={selectedPractitionerId} />
      )}
    </div>
  );
}