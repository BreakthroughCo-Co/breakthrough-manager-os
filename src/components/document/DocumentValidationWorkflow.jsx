import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, AlertTriangle, Edit2, Save, X } from 'lucide-react';

export default function DocumentValidationWorkflow({ extractedData, documentType, onApprove, onReject, isSubmitting }) {
  const [editingFields, setEditingFields] = useState({});
  const [corrections, setCorrections] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-600">High ({confidence}%)</Badge>;
    } else if (confidence >= 50) {
      return <Badge className="bg-yellow-600">Medium ({confidence}%)</Badge>;
    } else {
      return <Badge className="bg-red-600">Low ({confidence}%)</Badge>;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'border-green-200 bg-green-50';
    if (confidence >= 50) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const handleEditField = (fieldName) => {
    setEditingFields({ ...editingFields, [fieldName]: true });
  };

  const handleSaveField = (fieldName, newValue) => {
    setCorrections({ ...corrections, [fieldName]: newValue });
    setEditingFields({ ...editingFields, [fieldName]: false });
  };

  const handleRejectDocument = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(rejectionReason);
  };

  const handleApproveDocument = () => {
    onApprove(corrections);
  };

  const lowConfidenceFields = Object.entries(extractedData)
    .filter(([_, field]) => field.confidence < 70)
    .length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Document Data Validation</CardTitle>
            <CardDescription>
              Review extracted data with confidence scores. Correct any inaccuracies before approval.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">Document Type</div>
            <div className="font-semibold capitalize">{documentType.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Alert */}
        {lowConfidenceFields > 0 && (
          <Alert className="border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              <strong>{lowConfidenceFields} field(s) have confidence scores below 70%.</strong> Please review carefully.
            </AlertDescription>
          </Alert>
        )}

        {/* Field Validation Grid */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(extractedData).map(([fieldName, field]) => (
            <div
              key={fieldName}
              className={`border rounded-lg p-4 ${getConfidenceColor(field.confidence)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 capitalize">
                    {fieldName.replace(/_/g, ' ')}
                  </div>
                  {getConfidenceBadge(field.confidence)}
                </div>
                {field.confidence < 70 && (
                  <AlertTriangle className="h-4 w-4 text-red-600 ml-2" />
                )}
              </div>

              {editingFields[fieldName] ? (
                <div className="space-y-2 mt-3">
                  {typeof field.value === 'string' && field.value.length < 100 ? (
                    <Input
                      defaultValue={corrections[fieldName] || field.value || ''}
                      onChange={(e) => {}}
                      onBlur={(e) => handleSaveField(fieldName, e.target.value)}
                      autoFocus
                      className="bg-white"
                    />
                  ) : (
                    <Textarea
                      defaultValue={corrections[fieldName] || (typeof field.value === 'string' ? field.value : JSON.stringify(field.value)) || ''}
                      onChange={(e) => {}}
                      onBlur={(e) => handleSaveField(fieldName, e.target.value)}
                      autoFocus
                      className="bg-white"
                      rows={3}
                    />
                  )}
                  <div className="flex gap-2 text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingFields({ ...editingFields, [fieldName]: false })}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="bg-white rounded p-3 mb-2 text-sm text-slate-700 break-words">
                    {corrections[fieldName] ? (
                      <span className="font-semibold">{corrections[fieldName]}</span>
                    ) : typeof field.value === 'object' ? (
                      <pre className="text-xs overflow-x-auto">{JSON.stringify(field.value, null, 2)}</pre>
                    ) : (
                      field.value || 'NO DATA EXTRACTED'
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditField(fieldName)}
                    className="text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {!showRejectForm ? (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleApproveDocument}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Populate Entities
            </Button>
            <Button
              onClick={() => setShowRejectForm(true)}
              variant="destructive"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-4 border-t bg-red-50 p-4 rounded">
            <h4 className="font-semibold text-red-900">Reject Document</h4>
            <Textarea
              placeholder="Explain why this document cannot be processed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                onClick={handleRejectDocument}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                Confirm Rejection
              </Button>
              <Button
                onClick={() => setShowRejectForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}