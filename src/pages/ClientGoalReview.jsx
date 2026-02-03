import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClientGoalProgressAnalysis from '@/components/client/ClientGoalProgressAnalysis';
import { AlertCircle } from 'lucide-react';

export default function ClientGoalReview() {
  const [selectedClientId, setSelectedClientId] = useState(null);

  const { data: clients } = useQuery({
    queryKey: ['clients_active_goals'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data?.filter(c => c.status === 'active').sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
      ) || [];
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Client Goal Review</h1>
        <p className="text-slate-600 mt-2">Progress analysis and behaviour support plan optimization</p>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          AI analyzes case notes and progress indicators to assess goal achievement, identify stagnation, and suggest behaviour support plan modifications for optimized client outcomes.
        </AlertDescription>
      </Alert>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Client</CardTitle>
          <CardDescription>Analyze goal progress and review support plan</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Search clients..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Analysis Display */}
      {selectedClientId && (
        <ClientGoalProgressAnalysis clientId={selectedClientId} />
      )}
    </div>
  );
}