import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, X, Save, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const entityConfigs = {
  Client: {
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'waitlist', 'on_hold', 'discharged', 'plan_review'] },
      { key: 'service_type', label: 'Service Type', type: 'select', options: ['Behaviour Support', 'LEGO Therapy', 'Capacity Building', 'Combined'] },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['low', 'medium', 'high'] },
      { key: 'assigned_practitioner_id', label: 'Practitioner', type: 'practitioner' },
      { key: 'plan_end_date', label: 'Plan End Date', type: 'date_range' },
    ],
    searchFields: ['full_name', 'ndis_number'],
  },
  Practitioner: {
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'on_leave', 'probation', 'inactive'] },
      { key: 'role', label: 'Role', type: 'select', options: ['Behaviour Support Practitioner', 'Senior Practitioner', 'Practice Lead', 'Allied Health Assistant'] },
    ],
    searchFields: ['full_name', 'email'],
  },
  Task: {
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'deferred'] },
      { key: 'category', label: 'Category', type: 'select', options: ['Compliance', 'HR', 'Finance', 'Clinical', 'Operations', 'Strategic', 'Other'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
      { key: 'due_date', label: 'Due Date', type: 'date_range' },
    ],
    searchFields: ['title', 'description'],
  },
  BillingRecord: {
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'paid', 'rejected', 'queried'] },
      { key: 'service_type', label: 'Service Type', type: 'select', options: ['Assessment', 'Plan Development', 'Plan Review', 'Direct Support', 'Report Writing', 'Travel', 'Supervision', 'Group Session'] },
      { key: 'service_date', label: 'Service Date', type: 'date_range' },
    ],
    searchFields: ['client_name', 'practitioner_name', 'invoice_number'],
  },
  ComplianceItem: {
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['compliant', 'attention_needed', 'non_compliant', 'pending_review'] },
      { key: 'category', label: 'Category', type: 'select', options: ['NDIS Registration', 'Quality & Safeguards', 'Worker Screening', 'Insurance', 'Professional Development', 'Clinical Governance', 'Documentation', 'Other'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
    ],
    searchFields: ['title', 'description'],
  },
};

export default function AdvancedSearchFilter({ 
  entityType, 
  onFilterChange, 
  practitioners = [],
  initialFilters = {} 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  
  const queryClient = useQueryClient();
  const config = entityConfigs[entityType];

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches', entityType],
    queryFn: () => base44.entities.SavedSearch.filter({ entity_type: entityType }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches', entityType] });
      setIsSaveDialogOpen(false);
      setFilterName('');
    },
  });

  useEffect(() => {
    onFilterChange({ searchText, ...filters });
  }, [searchText, filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters };
    if (value === 'all' || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
  };

  const handleLoadSavedSearch = (saved) => {
    try {
      const parsed = JSON.parse(saved.filters);
      setFilters(parsed);
      setSearchText(parsed.searchText || '');
    } catch (e) {
      console.error('Failed to load saved search');
    }
  };

  const handleSaveFilter = () => {
    saveMutation.mutate({
      name: filterName,
      entity_type: entityType,
      filters: JSON.stringify({ ...filters, searchText }),
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
  };

  const activeFilterCount = Object.keys(filters).length + (searchText ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Search ${config?.searchFields?.join(', ')}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-teal-600">
                  {activeFilterCount}
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {savedSearches.length > 0 && (
          <Select onValueChange={(id) => {
            const saved = savedSearches.find(s => s.id === id);
            if (saved) handleLoadSavedSearch(saved);
          }}>
            <SelectTrigger className="w-40">
              <Bookmark className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Saved" />
            </SelectTrigger>
            <SelectContent>
              {savedSearches.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {config?.fields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  {field.type === 'select' && (
                    <Select
                      value={filters[field.key] || 'all'}
                      onValueChange={(v) => handleFilterChange(field.key, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {field.options.map(opt => (
                          <SelectItem key={opt} value={opt}>
                            {opt.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === 'practitioner' && (
                    <Select
                      value={filters[field.key] || 'all'}
                      onValueChange={(v) => handleFilterChange(field.key, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Practitioners</SelectItem>
                        {practitioners.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === 'date_range' && (
                    <Input
                      type="date"
                      className="mt-1"
                      value={filters[field.key] || ''}
                      onChange={(e) => handleFilterChange(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsSaveDialogOpen(true)}>
                <Save className="w-4 h-4 mr-1" />
                Save Filter
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Search Filter</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Filter Name</Label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="My saved filter"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFilter} disabled={!filterName} className="bg-teal-600 hover:bg-teal-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}