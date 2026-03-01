import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MANDATORY_MODULES = [
  'NDIS_code_of_conduct', 'first_aid', 'CPR', 'mandatory_reporting',
  'privacy_and_confidentiality', 'positive_behaviour_support', 'worker_screening'
];

function CellStatus({ status, expiryDate }) {
  const days = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
  if (status === 'current' || status === 'active') {
    if (days !== null && days <= 30) return <span title={`Expires in ${days}d`}><AlertTriangle className="w-4 h-4 text-amber-500" /></span>;
    return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  }
  if (status === 'expired') return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'expiring_soon') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (status === 'not_completed') return <XCircle className="w-4 h-4 text-slate-300" />;
  return <Minus className="w-4 h-4 text-slate-200" />;
}

export default function SkillTrainingMatrix() {
  const { data: practitioners = [] } = useQuery({ queryKey: ['practitioners'], queryFn: () => base44.entities.Practitioner.list() });
  const { data: trainingRecords = [] } = useQuery({ queryKey: ['trainingRecords'], queryFn: () => base44.entities.TrainingRecord.list() });
  const { data: credentials = [] } = useQuery({ queryKey: ['practitionerCredentials'], queryFn: () => base44.entities.PractitionerCredential.list() });

  const activePractitioners = practitioners.filter(p => p.status === 'active');

  // Build lookup: practitionerId -> moduleCategory -> record
  const trainingLookup = {};
  for (const tr of trainingRecords) {
    if (!trainingLookup[tr.practitioner_id]) trainingLookup[tr.practitioner_id] = {};
    trainingLookup[tr.practitioner_id][tr.module_category] = tr;
  }

  // Compliance score per practitioner
  const getComplianceScore = (practitionerId) => {
    const records = trainingLookup[practitionerId] || {};
    const completed = MANDATORY_MODULES.filter(m => {
      const r = records[m];
      return r && (r.status === 'current' || r.status === 'active');
    }).length;
    return Math.round((completed / MANDATORY_MODULES.length) * 100);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left p-2 border border-slate-200 font-medium text-slate-600 min-w-[150px]">Practitioner</th>
            <th className="p-2 border border-slate-200 font-medium text-slate-600 text-center">Score</th>
            {MANDATORY_MODULES.map(m => (
              <th key={m} className="p-2 border border-slate-200 font-medium text-slate-500 text-center min-w-[90px]" title={m.replace(/_/g, ' ')}>
                {m.replace(/_/g, ' ').replace('NDIS ', '').slice(0, 12)}
              </th>
            ))}
            <th className="p-2 border border-slate-200 font-medium text-slate-500 text-center">Specialisations</th>
          </tr>
        </thead>
        <tbody>
          {activePractitioners.map(p => {
            const score = getComplianceScore(p.id);
            const records = trainingLookup[p.id] || {};
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="p-2 border border-slate-200">
                  <p className="font-medium text-slate-800">{p.full_name}</p>
                  <p className="text-slate-400">{p.role?.split(' ')[0]}</p>
                </td>
                <td className="p-2 border border-slate-200 text-center">
                  <span className={cn('font-bold', score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600')}>{score}%</span>
                </td>
                {MANDATORY_MODULES.map(m => {
                  const record = records[m];
                  return (
                    <td key={m} className="p-2 border border-slate-200 text-center">
                      <div className="flex items-center justify-center">
                        <CellStatus status={record?.status} expiryDate={record?.expiry_date} />
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 border border-slate-200">
                  <div className="flex flex-wrap gap-1">
                    {(p.specialisations || []).map(s => (
                      <Badge key={s} className="bg-teal-50 text-teal-700 text-xs px-1 py-0">{s}</Badge>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">* Mandatory modules only. <CheckCircle className="w-3 h-3 inline text-emerald-500" /> Current · <AlertTriangle className="w-3 h-3 inline text-amber-500" /> Expiring ≤30d · <XCircle className="w-3 h-3 inline text-red-500" /> Expired/Missing</p>
    </div>
  );
}