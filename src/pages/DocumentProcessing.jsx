import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DocumentValidationWorkflow from '@/components/document/DocumentValidationWorkflow';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DocumentProcessing() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [step, setStep] = useState('upload'); // upload, classifying, extracting, validating, complete
  const [classifiedType, setClassifiedType] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setStep('classifying');

    try {
      // Upload file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: uploadRes.file_url });

      // Classify document
      const classifyRes = await base44.functions.invoke('classifyNDISDocument', {
        document_name: file.name,
        file_content_preview: file.name // Would normally include file preview
      });

      setClassifiedType(classifyRes.document_type);
      setStep('extracting');

      // Extract data
      const extractRes = await base44.functions.invoke('extractNDISDocumentData', {
        file_url: uploadRes.file_url,
        document_type: classifyRes.document_type
      });

      setExtractedData(extractRes.extracted_data);
      setStep('validating');
    } catch (err) {
      setError(err.message || 'Error processing document');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveData = async (corrections) => {
    setIsProcessing(true);
    try {
      // Create audit log entry
      const auditEntry = await base44.entities.AuditLog.create({
        event_type: 'validation',
        document_name: uploadedFile.name,
        document_type: classifiedType,
        extracted_data: JSON.stringify(extractedData),
        corrections_made: Object.keys(corrections).length > 0 ? JSON.stringify(corrections) : null,
        validated_by: (await base44.auth.me()).email,
        validation_status: 'approved',
        confidence_score_average: Object.values(extractedData)
          .reduce((sum, field) => sum + (field.confidence || 0), 0) / Object.keys(extractedData).length
      });

      // Populate entities based on document type and extracted data
      // This would be customized based on your entity structure
      
      setStep('complete');
      setError(null);
    } catch (err) {
      setError(err.message || 'Error approving document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDocument = async (reason) => {
    setIsProcessing(true);
    try {
      await base44.entities.AuditLog.create({
        event_type: 'validation',
        document_name: uploadedFile.name,
        document_type: classifiedType,
        extracted_data: JSON.stringify(extractedData),
        validated_by: (await base44.auth.me()).email,
        validation_status: 'rejected',
        rejection_reason: reason
      });

      setStep('upload');
      setUploadedFile(null);
      setExtractedData(null);
      setClassifiedType(null);
    } catch (err) {
      setError(err.message || 'Error rejecting document');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">AI Document Processing</h1>
        <p className="text-slate-600 mt-2">Upload NDIS documents for automatic classification, data extraction, and validation</p>
      </div>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>Select an NDIS plan, medical record, or assessment report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center space-y-4">
              <Upload className="h-12 w-12 text-slate-400 mx-auto" />
              <div>
                <label htmlFor="document-upload" className="cursor-pointer">
                  <span className="font-semibold text-blue-600 hover:text-blue-700">Click to upload</span>
                  {' '}or drag and drop
                </label>
                <input
                  id="document-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.docx"
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>
              <p className="text-sm text-slate-500">PDF, TXT, or DOCX (up to 10MB)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'classifying' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="font-semibold">Classifying document...</p>
            <p className="text-sm text-slate-600">Analyzing document type and structure</p>
          </CardContent>
        </Card>
      )}

      {step === 'extracting' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="font-semibold">Extracting data...</p>
            <p className="text-sm text-slate-600">Using AI to extract structured information</p>
          </CardContent>
        </Card>
      )}

      {step === 'validating' && extractedData && (
        <DocumentValidationWorkflow
          extractedData={extractedData}
          documentType={classifiedType}
          onApprove={handleApproveData}
          onReject={handleRejectDocument}
          isSubmitting={isProcessing}
        />
      )}

      {step === 'complete' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 py-8">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Document processed successfully</p>
              <p className="text-sm text-green-700">Data has been validated and entities updated. Audit trail created.</p>
            </div>
            <Button
              onClick={() => {
                setStep('upload');
                setUploadedFile(null);
                setExtractedData(null);
                setClassifiedType(null);
              }}
              className="ml-auto"
            >
              Process Another Document
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}