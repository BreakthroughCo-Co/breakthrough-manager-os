import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function ClientContactNetwork({ clientId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    contact_type: 'guardian',
    relationship: '',
    phone: '',
    email: '',
    preferred_communication: 'email',
    is_primary_contact: false,
    can_authorize_services: false
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['clientContacts', clientId],
    queryFn: () => base44.entities.ClientContact.filter({ client_id: clientId })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create({
      client_id: clientId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts', clientId] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId) => base44.entities.ClientContact.delete(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts', clientId] });
    }
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      contact_type: 'guardian',
      relationship: '',
      phone: '',
      email: '',
      preferred_communication: 'email',
      is_primary_contact: false,
      can_authorize_services: false
    });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const contactTypeColors = {
    parent: 'bg-blue-100 text-blue-800',
    guardian: 'bg-purple-100 text-purple-800',
    support_coordinator: 'bg-green-100 text-green-800',
    case_manager: 'bg-orange-100 text-orange-800',
    advocate: 'bg-pink-100 text-pink-800',
    family_member: 'bg-slate-100 text-slate-800'
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Support Network & Key Contacts</CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-3 bg-slate-50">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
              <Select value={formData.contact_type} onValueChange={(value) => setFormData({ ...formData, contact_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="family_member">Family Member</SelectItem>
                  <SelectItem value="support_coordinator">Support Coordinator</SelectItem>
                  <SelectItem value="case_manager">Case Manager</SelectItem>
                  <SelectItem value="advocate">Advocate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Relationship"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              />
              <Select value={formData.preferred_communication} onValueChange={(value) => setFormData({ ...formData, preferred_communication: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Preferred Communication" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.is_primary_contact}
                  onChange={(e) => setFormData({ ...formData, is_primary_contact: e.target.checked })}
                />
                Primary Contact
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.can_authorize_services}
                  onChange={(e) => setFormData({ ...formData, can_authorize_services: e.target.checked })}
                />
                Can Authorize Services
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Contact
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : contacts && contacts.length > 0 ? (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{contact.full_name}</span>
                      {contact.is_primary_contact && <Badge>Primary</Badge>}
                      <Badge className={contactTypeColors[contact.contact_type] || ''}>
                        {contact.contact_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{contact.relationship}</p>
                    {contact.email && <p className="text-sm text-slate-500">{contact.email}</p>}
                    {contact.phone && <p className="text-sm text-slate-500">{contact.phone}</p>}
                    {contact.can_authorize_services && (
                      <p className="text-xs text-green-700 mt-1">✓ Can authorize services</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(contact.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertTitle className="text-slate-600">No contacts added yet</AlertTitle>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}