import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Package,
  Download,
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  Lock
} from 'lucide-react';

/**
 * Audit Preparation
 * 
 * One-click audit evidence packaging with immutable timestamps.
 * Optimized for rapid audit response and compliance verification.
 */

export default function AuditPreparation() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [packageForm, setPackageForm] = useState({
    package_name: '',
    audit_type: 'NDIS_Registration',
    period_start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0]
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['auditPackages'],
    queryFn: () => base44.entities.AuditEvidencePackage.list('-created_date', 50)
  });

  const generatePackageMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke('generateAuditEvidencePackage', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditPackages'] });
      setShowPackageDialog(false);
    }
  });

  const downloadPackageMutation = useMutation({
    mutationFn: async (packageId) => {
      const { data } = await base44.functions.invoke('downloadAuditPackage', {
        package_id: packageId
      });
      
      // Open download URL
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }
      
      return data;
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      generating: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      exported: 'bg-teal-100 text-teal-700'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "text-2xl font-bold transition-colors duration-300",
            isDark ? "text-slate-50" : "text-slate-900"
          )}>
            Audit Preparation
          </h2>
          <p className={cn(
            "mt-1 transition-colors duration-300",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            Generate immutable evidence packages for regulatory audits
          </p>
        </div>
        <Button
          onClick={() => setShowPackageDialog(true)}
          className="bg-teal-600 hover:bg-teal-700 touch-manipulation select-none min-h-[44px]"
        >
          <Package className="h-4 w-4 mr-2" />
          Generate Package
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Total Packages
                </p>
                <p className="text-3xl font-bold mt-2">{packages.length}</p>
              </div>
              <Package className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Last Generated
                </p>
                <p className="text-xl font-bold mt-2">
                  {packages[0]?.generation_timestamp 
                    ? new Date(packages[0].generation_timestamp).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                    : 'Never'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-colors duration-300",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Encrypted
                </p>
                <p className="text-3xl font-bold mt-2">
                  {packages.filter(p => p.encryption_status === 'encrypted').length}
                </p>
              </div>
              <Lock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package List */}
      <Card className={cn(
        "transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white"
      )}>
        <CardHeader>
          <CardTitle>Evidence Packages</CardTitle>
          <CardDescription>Generated audit documentation with integrity verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className={cn(
                "p-4 rounded-lg border transition-colors duration-300",
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getStatusColor(pkg.status)}>
                        {pkg.status}
                      </Badge>
                      <Badge variant="outline">
                        {pkg.audit_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <h4 className={cn(
                      "font-medium",
                      isDark ? "text-slate-200" : "text-slate-900"
                    )}>
                      {pkg.package_name}
                    </h4>
                    <p className={cn(
                      "text-sm mt-1",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      {new Date(pkg.audit_period_start).toLocaleDateString('en-AU')} - {new Date(pkg.audit_period_end).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-3">
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Records
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {pkg.total_records?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Generated
                    </p>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-200" : "text-slate-900")}>
                      {new Date(pkg.generation_timestamp).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Checksum
                    </p>
                    <p className={cn("text-xs font-mono", isDark ? "text-slate-200" : "text-slate-900")}>
                      {pkg.checksum?.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      Security
                    </p>
                    <Badge variant="outline" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      {pkg.encryption_status}
                    </Badge>
                  </div>
                </div>

                {pkg.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPackageMutation.mutate(pkg.id)}
                    disabled={downloadPackageMutation.isPending}
                    className="touch-manipulation select-none min-h-[44px] md:min-h-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Package
                  </Button>
                )}
              </div>
            ))}

            {packages.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  No audit packages generated yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Package Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className={cn(
          "touch-manipulation",
          isDark ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle>Generate Audit Evidence Package</DialogTitle>
            <DialogDescription>
              Export comprehensive audit documentation with immutable timestamps
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Package Name</Label>
              <Input
                value={packageForm.package_name}
                onChange={(e) => setPackageForm({...packageForm, package_name: e.target.value})}
                placeholder="e.g., Q4 2025 Registration Audit"
                className="min-h-[44px]"
              />
            </div>

            <div>
              <Label>Audit Type</Label>
              <Select
                value={packageForm.audit_type}
                onValueChange={(val) => setPackageForm({...packageForm, audit_type: val})}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NDIS_Registration">NDIS Registration</SelectItem>
                  <SelectItem value="Quality_Audit">Quality Audit</SelectItem>
                  <SelectItem value="Compliance_Review">Compliance Review</SelectItem>
                  <SelectItem value="Internal_Audit">Internal Audit</SelectItem>
                  <SelectItem value="Incident_Investigation">Incident Investigation</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={packageForm.period_start}
                  onChange={(e) => setPackageForm({...packageForm, period_start: e.target.value})}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={packageForm.period_end}
                  onChange={(e) => setPackageForm({...packageForm, period_end: e.target.value})}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPackageDialog(false)}
              className="touch-manipulation select-none min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => generatePackageMutation.mutate(packageForm)}
              disabled={!packageForm.package_name || generatePackageMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 touch-manipulation select-none min-h-[44px]"
            >
              {generatePackageMutation.isPending ? 'Generating...' : 'Generate Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}