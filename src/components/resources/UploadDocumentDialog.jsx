import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Loader2 } from 'lucide-react';

const CATEGORIES = [
  'NDIS Regulations', 'Templates', 'Policies', 'Training Materials', 'Tools & Checklists', 'Forms', 'Other'
];

export default function UploadDocumentDialog({ open, onClose, onSuccess, editingDoc = null }) {
  const [form, setForm] = useState({
    title: editingDoc?.title || '',
    description: editingDoc?.description || '',
    category: editingDoc?.category || '',
    tags: editingDoc?.tags || [],
    file_type: editingDoc?.file_type || 'pdf',
    version: editingDoc ? '' : '1.0',
    version_notes: '',
    is_mandatory: editingDoc?.is_mandatory || false
  });
  const [tagInput, setTagInput] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const isNewVersion = !!editingDoc;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm({ ...form, tags: form.tags.filter(t => t !== tag) });

  const handleSubmit = async () => {
    if (!form.title || !form.category) {
      setError('Title and category are required.');
      return;
    }
    if (!editingDoc && !file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    let file_url = editingDoc?.file_url;
    let file_name = editingDoc?.file_name;

    if (file) {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      file_url = uploadResult.file_url;
      file_name = file.name;
    }

    const user = await base44.auth.me();

    if (isNewVersion) {
      // Supersede the existing document
      await base44.entities.ResourceDocument.update(editingDoc.id, { status: 'superseded' });
      // Create new version
      await base44.entities.ResourceDocument.create({
        ...form,
        file_url,
        file_name,
        status: 'current',
        download_count: 0,
        uploaded_by: user.email,
        previous_version_id: editingDoc.id
      });
    } else {
      await base44.entities.ResourceDocument.create({
        ...form,
        file_url,
        file_name,
        status: 'current',
        download_count: 0,
        uploaded_by: user.email
      });
    }

    setUploading(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNewVersion ? `Upload New Version — ${editingDoc.title}` : 'Upload Document'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          {!isNewVersion && (
            <>
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Behaviour Support Plan Template" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File Type</Label>
                  <Select value={form.file_type} onValueChange={v => setForm({ ...form, file_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'video', 'other'].map(t => (
                        <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_mandatory} onCheckedChange={v => setForm({ ...form, is_mandatory: v })} />
                <Label>Mandatory compliance document</Label>
              </div>
            </>
          )}

          {/* Version fields always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version *</Label>
              <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 2.0" />
            </div>
          </div>
          <div>
            <Label>Version Notes / Changelog</Label>
            <Textarea value={form.version_notes} onChange={e => setForm({ ...form, version_notes: e.target.value })} rows={2} placeholder="What changed in this version?" />
          </div>

          {/* Tags */}
          {!isNewVersion && (
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* File upload */}
          <div>
            <Label>{isNewVersion ? 'New File *' : 'File *'}</Label>
            <div
              className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 transition"
              onClick={() => document.getElementById('resource-file-input').click()}
            >
              {file ? (
                <p className="text-sm text-teal-600 font-medium">{file.name}</p>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-500">Click to select file</p>
                </div>
              )}
              <input id="resource-file-input" type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : isNewVersion ? 'Publish New Version' : 'Upload Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}