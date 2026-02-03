import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { validateSchema, getSchemaForEntity } from './clinicalSchemas';

/**
 * Validation boundary component
 * Validates data before submission and shows inline errors
 */
export default function ValidationGuard({ 
  entityType, 
  data, 
  onValidationChange,
  children 
}) {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!data || !entityType) {
      setErrors([]);
      if (onValidationChange) onValidationChange(true, []);
      return;
    }

    const schema = getSchemaForEntity(entityType);
    if (!schema) {
      setErrors([]);
      if (onValidationChange) onValidationChange(true, []);
      return;
    }

    const validation = validateSchema(schema, data);
    setErrors(validation.errors);
    if (onValidationChange) {
      onValidationChange(validation.valid, validation.errors);
    }
  }, [data, entityType]);

  if (errors.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <Alert className="bg-red-50 border-red-200 mb-4">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-sm text-red-800">
          <p className="font-medium mb-2">Please correct the following errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((err, i) => (
              <li key={i}>
                <strong>{err.field}</strong>: {err.message}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
      {children}
    </>
  );
}