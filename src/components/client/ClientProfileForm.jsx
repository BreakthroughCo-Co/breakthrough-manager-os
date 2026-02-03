import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ClientProfileForm({ clientId = null, onSave = null }) {
  const [formData, setFormData] = useState({
    full_name: '',
    ndis_number: '',
    date_of_birth: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    plan_start_date: '',
    plan_end_date: '',
    funding_allocated: '',
    status: 'active',
    service_type: 'Behaviour Support',
    risk_level: 'low',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const client = await base44.entities.Client.get(clientId);
      setFormData(client);
    } catch (err) {
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (clientId) {
        await base44.entities.Client.update(clientId, formData);
      } else {
        await base44.entities.Client.create(formData);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onSave) onSave();
    } catch (err) {
      setError(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (loading && clientId) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertTitle>Client profile saved successfully</AlertTitle>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="ndis">NDIS Plan</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* PERSONAL DETAILS */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Client's full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Service Type</label>
                  <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Behaviour Support">Behaviour Support</SelectItem>
                      <SelectItem value="LEGO Therapy">LEGO Therapy</SelectItem>
                      <SelectItem value="Capacity Building">Capacity Building</SelectItem>
                      <SelectItem value="Combined">Combined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Level</label>
                  <Select value={formData.risk_level} onValueChange={(value) => handleInputChange('risk_level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                    <SelectItem value="plan_review">Plan Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about the client"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NDIS PLAN */}
        <TabsContent value="ndis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NDIS Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">NDIS Participant Number *</label>
                <Input
                  value={formData.ndis_number}
                  onChange={(e) => handleInputChange('ndis_number', e.target.value)}
                  placeholder="e.g., 123456789"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Plan Start Date</label>
                  <Input
                    type="date"
                    value={formData.plan_start_date}
                    onChange={(e) => handleInputChange('plan_start_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Plan End Date</label>
                  <Input
                    type="date"
                    value={formData.plan_end_date}
                    onChange={(e) => handleInputChange('plan_end_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funding Allocated ($)</label>
                  <Input
                    type="number"
                    value={formData.funding_allocated}
                    onChange={(e) => handleInputChange('funding_allocated', parseFloat(e.target.value) || '')}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Funding Utilised ($)</label>
                  <Input
                    type="number"
                    disabled
                    placeholder="Auto-calculated"
                    value={formData.funding_utilised || ''}
                  />
                </div>
              </div>

              {formData.funding_allocated && formData.funding_utilised !== undefined && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Funding Available:</strong> ${(formData.funding_allocated - (formData.funding_utilised || 0)).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACT DETAILS */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Contact Name</label>
                <Input
                  value={formData.primary_contact_name}
                  onChange={(e) => handleInputChange('primary_contact_name', e.target.value)}
                  placeholder="Guardian or primary contact name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={formData.primary_contact_phone}
                    onChange={(e) => handleInputChange('primary_contact_phone', e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={(e) => handleInputChange('primary_contact_email', e.target.value)}
                    placeholder="Email address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {clientId ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </form>
  );
}