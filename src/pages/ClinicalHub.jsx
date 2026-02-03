import React, { useState } from 'react';
import CaseNoteSummarizer from '@/components/clinical/CaseNoteSummarizer';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Brain,
  FileSearch,
  Activity,
  ScrollText,
  BookOpen,
  AlertTriangle,
  Lock,
  Gauge,
  ArrowRight,
  Users,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const clinicalTools = [
  {
    name: 'Functional Behaviour Assessment',
    description: 'Multi-step FBA forms for history and observation data',
    icon: FileSearch,
    page: 'FBAAssessment',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    name: 'ABC & Scatterplot Analyser',
    description: 'Data-entry grid with auto-generated visual charts',
    icon: Activity,
    page: 'ABCAnalyser',
    color: 'bg-purple-100 text-purple-700'
  },
  {
    name: 'Behaviour Support Plan Creator',
    description: 'Generate BSPs from FBA and ABC data',
    icon: ScrollText,
    page: 'BSPCreator',
    color: 'bg-teal-100 text-teal-700'
  },
  {
    name: 'Social Story & Visual Script Creator',
    description: 'AI-powered social story generation',
    icon: BookOpen,
    page: 'SocialStories',
    color: 'bg-amber-100 text-amber-700'
  },
  {
    name: 'Root Cause Analysis (5 Whys)',
    description: 'Guided RCA using the 5 Whys framework',
    icon: AlertTriangle,
    page: 'RootCauseAnalysis',
    color: 'bg-orange-100 text-orange-700'
  },
  {
    name: 'Restrictive Practice Protocol',
    description: 'Compliance registry for restrictive practices',
    icon: Lock,
    page: 'RestrictivePractices',
    color: 'bg-red-100 text-red-700'
  },
  {
    name: 'PBS Capability Assessment',
    description: 'Assess implementer/staff competency',
    icon: Gauge,
    page: 'CapabilityAssessment',
    color: 'bg-indigo-100 text-indigo-700'
  },
];

export default function ClinicalHub() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: fbas = [] } = useQuery({
    queryKey: ['fbas'],
    queryFn: () => base44.entities.FunctionalBehaviourAssessment.list(),
  });

  const { data: bsps = [] } = useQuery({
    queryKey: ['bsps'],
    queryFn: () => base44.entities.BehaviourSupportPlan.list(),
  });

  const { data: restrictivePractices = [] } = useQuery({
    queryKey: ['restrictivePractices'],
    queryFn: () => base44.entities.RestrictivePractice.list(),
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const draftFBAs = fbas.filter(f => f.status === 'draft' || f.status === 'in_progress').length;
  const activeBSPs = bsps.filter(b => b.status === 'active').length;
  const unauthorisedRP = restrictivePractices.filter(r => r.authorisation_status === 'unauthorised').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="w-7 h-7 text-teal-600" />
          PBS Clinical Hub
        </h2>
        <p className="text-slate-500 mt-1">Behaviour Support tools and clinical documentation</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeClients}</p>
                <p className="text-xs text-slate-500">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{draftFBAs}</p>
                <p className="text-xs text-slate-500">FBAs In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{activeBSPs}</p>
                <p className="text-xs text-slate-500">Active BSPs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{unauthorisedRP}</p>
                <p className="text-xs text-slate-500">Unauthorised RP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Tools Grid */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Clinical Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinicalTools.map((tool) => (
            <Link key={tool.page} to={createPageUrl(tool.page)}>
              <Card className="h-full hover:shadow-lg transition-all hover:border-teal-200 cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", tool.color)}>
                      <tool.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{tool.name}</h4>
                      <p className="text-sm text-slate-500 mt-1">{tool.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    )}
    </div>
  );
}