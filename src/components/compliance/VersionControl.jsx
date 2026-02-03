import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Lock, FileText, AlertTriangle, Clock } from 'lucide-react';
import { validateSchema, getSchemaForEntity } from '@/components/validation/clinicalSchemas';
import { auditLog } from '@/components/compliance/auditLogger';

/**
 * Version control component for clinical artefacts
 * Enforces draft → review → approved → published lifecycle
 */
export default function VersionControl({ 
  document, 
  entityType, 
  onUpdate,
  showActions = true 
}) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const queryClient = useQueryClient();

  const canEdit = document.lifecycle_stage === 'draft';
  const canReview = document.lifecycle_stage === 'draft';
  const canApprove = document.lifecycle_stage === 'review';
  const canPublish = document.lifecycle_stage === 'approved';
  const isImmutable = document.lifecycle_stage === 'published';

  const transitionMutation = useMutation({
    mutationFn: async ({ stage, updates }) => {
      const updatedDoc = await base44.entities[entityType].update(document.id, updates);
      return { stage, document: updatedDoc };
    },
    onSuccess: ({ stage, document: updatedDoc }) => {
      queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase()] });
      if (onUpdate) onUpdate(updatedDoc);
      
      // Log the transition
      auditLog.updated(entityType, document.id, 
        { lifecycle_stage: { from: document.lifecycle_stage, to: stage } },
        { action: `Transitioned to ${stage}`, documentVersion: updatedDoc.version_number }
      );
    },
  });

  const handleSubmitForReview = () => {
    // Validate before transitioning
    const schema = getSchemaForEntity(entityType);
    if (schema) {
      const validation = validateSchema(schema, document);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }
    }

    transitionMutation.mutate({
      stage: 'review',
      updates: { lifecycle_stage: 'review' }
    });
  };

  const handleApprove = async () => {
    const user = await base44.auth.me();
    transitionMutation.mutate({
      stage: 'approved',
      updates: {
        lifecycle_stage: 'approved',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
      }
    });
    setShowApproveDialog(false);
  };

  const handlePublish = async () => {
    // Mark previous versions as superseded
    if (document.parent_plan_id || document.parent_assessment_id) {
      const parentId = document.parent_plan_id || document.parent_assessment_id;
      await base44.entities[entityType].update(parentId, {
        is_latest_version: false,
        status: 'superseded',
      });
    }

    transitionMutation.mutate({
      stage: 'published',
      updates: {
        lifecycle_stage: 'published',
        published_date: new Date().toISOString(),
        is_latest_version: true,
        status: 'active',
      }
    });
    setShowPublishDialog(false);

    // Log critical event
    auditLog.critical('published', entityType, {
      entityId: document.id,
      version: document.version_number,
      message: `${entityType} published and locked`,
    });
  };

  const getStageInfo = () => {
    const stages = {
      draft: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Draft' },
      review: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Review' },
      approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' },
      published: { icon: Lock, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Published' },
    };
    return stages[document.lifecycle_stage] || stages.draft;
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={`${stageInfo.bg} ${stageInfo.color} border-0`}>
          <Icon className="w-3 h-3 mr-1" />
          {stageInfo.label}
        </Badge>
        {document.version_number && (
          <Badge variant="outline">v{document.version_number}</Badge>
        )}
        {isImmutable && (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-0">
            <Lock className="w-3 h-3 mr-1" />
            Immutable
          </Badge>
        )}
      </div>

      {/* Immutability Warning */}
      {isImmutable && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            This document is published and cannot be edited. To make changes, create a new version.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800">
            <p className="font-medium mb-1">Document validation failed:</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err.field}: {err.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          {canReview && (
            <Button
              onClick={handleSubmitForReview}
              size="sm"
              disabled={transitionMutation.isPending}
            >
              Submit for Review
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={() => setShowApproveDialog(true)}
              size="sm"
              variant="outline"
              disabled={transitionMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {canPublish && (
            <Button
              onClick={() => setShowPublishDialog(true)}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={transitionMutation.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Publish & Lock
            </Button>
          )}
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this {entityType}? This will mark it as ready for publication.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish & Lock Document</DialogTitle>
            <DialogDescription>
              This will publish the document and make it <strong>immutable</strong>. 
              No further edits will be possible. This action is logged for compliance.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-amber-50 border-amber-200">
            <Lock className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              Once published, this document cannot be changed. You'll need to create a new version for updates.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button onClick={handlePublish} className="bg-teal-600 hover:bg-teal-700">
              Publish & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}