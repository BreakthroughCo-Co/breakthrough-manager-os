import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';

export default function NDISLineItemValidator({ ndisLineItem, rate, onChange }) {
  const [status, setStatus] = useState(null); // null | 'loading' | { valid, warnings, catalogue_item }
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!ndisLineItem) { setStatus(null); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStatus('loading');
      const res = await base44.functions.invoke('validateNDISLineItem', {
        ndis_line_item: ndisLineItem,
        rate: parseFloat(rate) || 0,
      });
      setStatus(res.data);
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [ndisLineItem, rate]);

  if (!ndisLineItem || status === null) return null;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Validating against NDIS 2024-25 Price Limits...
      </div>
    );
  }

  const { valid, warnings, catalogue_item } = status;

  return (
    <div className="mt-1 space-y-1">
      {catalogue_item && (
        <div className="flex items-center gap-1.5 text-xs text-teal-600">
          <CheckCircle className="w-3 h-3 flex-shrink-0" />
          <span>{catalogue_item.description} · Max: ${catalogue_item.max_rate.toFixed(2)}/{catalogue_item.unit}</span>
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 ${
          w.severity === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {w.severity === 'error'
            ? <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            : <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />}
          {w.message}
        </div>
      ))}
    </div>
  );
}