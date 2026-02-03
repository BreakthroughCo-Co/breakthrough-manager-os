import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Search, Loader2, Download, Eye } from 'lucide-react';

export default function DocumentManager({ clientId, clientName }) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    document_type: 'other',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['clientDocuments', clientId],
    queryFn: () => base44.entities.ClientDocument.filter({ 
      client_id: clientId,
      is_latest_version: true 
    }),
    enabled: !!clientId,
  });

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const user = await base44.auth.me();
      
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: selectedFile,
      });

      // Create document record
      await base44.entities.ClientDocument.create({
        client_id: clientId,
        client_name: clientName,
        document_name: uploadForm.document_name || selectedFile.name,
        document_type: uploadForm.document_type,
        file_url: uploadResult.file_url,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        uploaded_by: user.email,
        upload_date: new Date().toISOString(),
        notes: uploadForm.notes,
        tags: JSON.stringify([]),
      });

      // Trigger OCR processing
      await base44.functions.invoke('processDocumentOCR', {
        document_id: uploadResult.file_url,
        file_url: uploadResult.file_url,
      });

      queryClient.invalidateQueries({ queryKey: ['clientDocuments', clientId] });
      setIsUploadDialogOpen(false);
      setUploadForm({ document_name: '', document_type: 'other', notes: '' });
      setSelectedFile(null);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.document_name?.toLowerCase().includes(searchLower) ||
      doc.extracted_text?.toLowerCase().includes(searchLower) ||
      doc.document_type?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents ({documents.length})
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="pl-8 w-[200px]"
            />
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Document Name</Label>
                  <Input
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm({...uploadForm, document_name: e.target.value})}
                    placeholder="Leave empty to use filename"
                  />
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select
                    value={uploadForm.document_type}
                    onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intake_form">Intake Form</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="bsp">Behaviour Support Plan</SelectItem>
                      <SelectItem value="fba">Functional Behaviour Assessment</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="consent_form">Consent Form</SelectItem>
                      <SelectItem value="medical_record">Medical Record</SelectItem>
                      <SelectItem value="correspondence">Correspondence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({...uploadForm, notes: e.target.value})}
                    placeholder="Optional notes"
                  />
                </div>
                <div>
                  <Label>File</Label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {filteredDocuments.map(doc => (
          <Card key={doc.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">{doc.document_name}</h4>
                    <Badge variant="outline">{doc.document_type.replace(/_/g, ' ')}</Badge>
                    {doc.ocr_processed && (
                      <Badge variant="secondary" className="text-xs">Searchable</Badge>
                    )}
                    {doc.version_number > 1 && (
                      <Badge variant="outline" className="text-xs">v{doc.version_number}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</span>
                    <span>By: {doc.uploaded_by}</span>
                    <span>Size: {(doc.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = doc.file_url;
                      a.download = doc.document_name;
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredDocuments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {searchTerm ? 'No matching documents found' : 'No documents uploaded yet'}
          </p>
        )}
      </div>
    </div>
  );
}