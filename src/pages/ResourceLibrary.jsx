import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Search, Plus, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResourceLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Sample resource library structure
  const resources = [
    // NDIS Templates
    {
      id: 'template_bsp',
      name: 'Behaviour Support Plan Template',
      category: 'templates',
      type: 'docx',
      description: 'Complete BSP template with NDIS compliance checkpoints',
      tags: ['BSP', 'compliance', 'client-facing'],
      url: '#'
    },
    {
      id: 'template_casenote',
      name: 'Case Note Template (SOAP)',
      category: 'templates',
      type: 'docx',
      description: 'Standardised SOAP-format case note with compliance flagging',
      tags: ['case-notes', 'documentation'],
      url: '#'
    },
    {
      id: 'template_serviceagreement',
      name: 'Service Agreement Template',
      category: 'templates',
      type: 'docx',
      description: 'Client and practitioner service agreement with NDIS terms',
      tags: ['legal', 'client-facing'],
      url: '#'
    },
    {
      id: 'template_planreview',
      name: 'Plan Review Report Template',
      category: 'templates',
      type: 'docx',
      description: 'Structured plan review with outcome reporting',
      tags: ['reporting', 'compliance'],
      url: '#'
    },

    // Policies
    {
      id: 'policy_complaints',
      name: 'Complaints & Disputes Resolution Policy',
      category: 'policies',
      type: 'pdf',
      description: 'NDIS QS compliant complaints handling procedure',
      tags: ['NDIS', 'quality-safeguards'],
      url: '#'
    },
    {
      id: 'policy_privacy',
      name: 'Privacy & Confidentiality Policy',
      category: 'policies',
      type: 'pdf',
      description: 'APPs and NDIS privacy compliance framework',
      tags: ['privacy', 'legal'],
      url: '#'
    },
    {
      id: 'policy_riskmanagement',
      name: 'Risk Management & Incident Policy',
      category: 'policies',
      type: 'pdf',
      description: 'Incident reporting, investigation, and follow-up procedures',
      tags: ['risk', 'compliance'],
      url: '#'
    },
    {
      id: 'policy_workerscreening',
      name: 'Worker Screening & Background Checks Policy',
      category: 'policies',
      type: 'pdf',
      description: 'NDIS worker screening requirements and procedures',
      tags: ['worker-screening', 'HR'],
      url: '#'
    },
    {
      id: 'policy_behaviorsupport',
      name: 'Behaviour Support & Restrictive Practices Policy',
      category: 'policies',
      type: 'pdf',
      description: 'Restrictive practice authorisation and PBS implementation',
      tags: ['behaviour', 'restrictive-practices', 'compliance'],
      url: '#'
    },

    // NDIS Regulations & Guidance
    {
      id: 'ndis_qscreqs',
      name: 'NDIS Quality & Safeguards Commission Requirements',
      category: 'regulations',
      type: 'pdf',
      description: 'QS Commission compliance standards (2024)',
      tags: ['QS', 'compliance', 'authoritative'],
      url: '#'
    },
    {
      id: 'ndis_pricingguide',
      name: 'NDIS Pricing Guide 2025',
      category: 'regulations',
      type: 'xlsx',
      description: 'Current NDIS support item pricing and maximum rates',
      tags: ['pricing', 'PRODA', 'reference'],
      url: '#'
    },
    {
      id: 'ndis_registrationstandards',
      name: 'NDIS Registration Standards',
      category: 'regulations',
      type: 'pdf',
      description: 'NDIS provider registration and certification requirements',
      tags: ['registration', 'compliance'],
      url: '#'
    },
    {
      id: 'ndis_participantlaw',
      name: 'NDIS Act & Rules Summary',
      category: 'regulations',
      type: 'pdf',
      description: 'Key legislative requirements and participant rights',
      tags: ['legislation', 'reference'],
      url: '#'
    },

    // Training Materials
    {
      id: 'training_ndiscodeof conduct',
      name: 'NDIS Code of Conduct Training Module',
      category: 'training',
      type: 'video',
      description: 'Mandatory module covering ethical practice and accountability',
      tags: ['mandatory', 'training', 'compliance'],
      url: '#'
    },
    {
      id: 'training_restrictivepractices',
      name: 'Restrictive Practices Authorisation Training',
      category: 'training',
      type: 'pdf',
      description: 'Consent, monitoring, and reporting requirements',
      tags: ['mandatory', 'behaviour', 'training'],
      url: '#'
    },
    {
      id: 'training_mandatoryreporting',
      name: 'Mandatory Reporting Obligations',
      category: 'training',
      type: 'pdf',
      description: 'Identifying and reporting safeguarding concerns',
      tags: ['mandatory', 'training', 'safeguarding'],
      url: '#'
    },

    // Checklists & Tools
    {
      id: 'tool_auditchecklist',
      name: 'NDIS Audit Readiness Checklist',
      category: 'tools',
      type: 'xlsx',
      description: 'Complete audit preparation checklist with timelines',
      tags: ['audit', 'compliance', 'checklist'],
      url: '#'
    },
    {
      id: 'tool_compliancematrix',
      name: 'Compliance Requirements Matrix',
      category: 'tools',
      type: 'xlsx',
      description: 'Cross-reference of NDIS standards, QS requirements, and internal controls',
      tags: ['compliance', 'reference', 'strategic'],
      url: '#'
    },
    {
      id: 'tool_incidentlogttemplate',
      name: 'Incident Log & Investigation Template',
      category: 'tools',
      type: 'xlsx',
      description: 'Structured incident recording and root cause analysis',
      tags: ['incident', 'documentation'],
      url: '#'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Resources' },
    { id: 'templates', name: 'Templates', count: 4, icon: FileText },
    { id: 'policies', name: 'Policies', count: 5, icon: Folder },
    { id: 'regulations', name: 'NDIS Regulations', count: 4, icon: FileText },
    { id: 'training', name: 'Training Materials', count: 3, icon: FileText },
    { id: 'tools', name: 'Tools & Checklists', count: 3, icon: FileText }
  ];

  const filtered = resources.filter(r =>
    (selectedCategory === 'all' || r.category === selectedCategory) &&
    (searchQuery === '' || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Resource Library</h1>
        <p className="text-slate-600">Templates, policies, NDIS regulations, training materials, and compliance tools</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search resources by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.name}
              {cat.count && <span className="ml-1 text-xs text-slate-600">({cat.count})</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Resources Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {filtered.map(resource => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-sm">{resource.name}</CardTitle>
                    <p className="text-xs text-slate-600 mt-1">{resource.type.toUpperCase()}</p>
                  </div>
                  <Badge variant="outline">{resource.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600">{resource.description}</p>
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full gap-2 text-xs">
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No resources match your search.</p>
          </div>
        )}
      </Tabs>

      {/* Upload Section (Admin) */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Add Resource (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4" />
            Upload New Resource
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}