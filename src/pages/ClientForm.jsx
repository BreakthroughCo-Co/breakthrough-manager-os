import React from 'react';
import { useNavigate } from 'react-router-dom';
import ClientProfileForm from '@/components/client/ClientProfileForm';

export default function ClientFormPage() {
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/Clients');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create New Client</h1>
        <p className="text-slate-600">
          Complete client profile with NDIS details, goals, support networks, and communication preferences.
        </p>
      </div>

      <ClientProfileForm onSave={handleSave} />
    </div>
  );
}