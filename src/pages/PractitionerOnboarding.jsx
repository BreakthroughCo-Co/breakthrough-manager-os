import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';
import PractitionerOnboardingWorkflow from '@/components/onboarding/PractitionerOnboardingWorkflow';
import PersonalizedLearningPathViewer from '@/components/training/PersonalizedLearningPathViewer';

export default function PractitionerOnboarding() {
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(null);

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list()
  });

  const recentPractitioners = practitioners
    ?.filter(p => {
      if (!p.start_date) return false;
      const startDate = new Date(p.start_date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return startDate >= threeMonthsAgo;
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-teal-600" />
          Practitioner Onboarding
        </h1>
        <p className="text-slate-600 mt-1">
          AI-powered personalized learning paths for NDIS compliance and best practices
        </p>
      </div>

      {/* Practitioner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Practitioner</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPractitionerId || ''} onValueChange={setSelectedPractitionerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a practitioner to view their onboarding plan..." />
            </SelectTrigger>
            <SelectContent>
              {recentPractitioners?.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                    Recent Hires (Last 3 months)
                  </div>
                  {recentPractitioners.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} - {p.role} (Started {new Date(p.start_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </>
              )}
              {practitioners?.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-t mt-2">
                    All Practitioners
                  </div>
                  {practitioners
                    .filter(p => !recentPractitioners?.some(rp => rp.id === p.id))
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} - {p.role}
                      </SelectItem>
                    ))}
                </>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Onboarding Workflow */}
      {selectedPractitionerId && (
        <div className="space-y-6">
          <PersonalizedLearningPathViewer practitionerId={selectedPractitionerId} />
          <PractitionerOnboardingWorkflow practitionerId={selectedPractitionerId} />
        </div>
      )}
    </div>
  );
}