import { z } from 'zod';

// ─── CaseNote ────────────────────────────────────────────────────────────────
export const CaseNoteSchema = z.object({
  client_id: z.string().min(1, 'client_id is required'),
  client_name: z.string().optional(),
  practitioner_id: z.string().optional(),
  practitioner_name: z.string().optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'session_date must be YYYY-MM-DD'),
  session_type: z.enum([
    'direct_support', 'assessment', 'plan_development',
    'review', 'consultation', 'training',
  ]).default('direct_support'),
  duration_minutes: z.number().int().positive().optional(),
  location: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  refined_note: z.string().optional(),
  ai_summary: z.string().optional(),
  ndis_compliance_flags: z.array(z.string()).optional(),
  suggested_ndis_line_items: z.string().optional(), // JSON string
  goals_addressed: z.string().optional(),
  progress_rating: z.enum([
    'regression', 'no_change', 'emerging', 'progressing', 'achieved',
  ]).default('progressing'),
  status: z.enum(['draft', 'completed', 'reviewed']).default('draft'),
  notes: z.string().optional(),
});

// ─── Practitioner ────────────────────────────────────────────────────────────
export const PractitionerSchema = z.object({
  full_name: z.string().min(1, 'full_name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  role: z.enum([
    'Behaviour Support Practitioner', 'Senior Practitioner',
    'Practice Lead', 'Allied Health Assistant',
  ]),
  registration_number: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'probation', 'inactive']).default('active'),
  caseload_capacity: z.number().int().nonnegative().optional(),
  current_caseload: z.number().int().nonnegative().optional(),
  billable_hours_target: z.number().nonnegative().optional(),
  billable_hours_actual: z.number().nonnegative().optional(),
  certifications: z.array(z.string()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

// ─── BillingRecord ───────────────────────────────────────────────────────────
export const BillingRecordSchema = z.object({
  client_id: z.string().min(1, 'client_id is required'),
  client_name: z.string().optional(),
  practitioner_id: z.string().optional(),
  practitioner_name: z.string().optional(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'service_date must be YYYY-MM-DD'),
  service_type: z.enum([
    'Assessment', 'Plan Development', 'Plan Review',
    'Direct Support', 'Report Writing', 'Travel',
    'Supervision', 'Group Session',
  ]),
  ndis_line_item: z.string().optional(),
  duration_hours: z.number().positive('duration_hours must be > 0'),
  rate: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  status: z.enum(['draft', 'submitted', 'paid', 'rejected', 'queried']).default('draft'),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Validates data against a Zod schema.
 * @returns {{ valid: true, data: object } | { valid: false, errors: string[] }}
 */
export function validateEntity(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { valid: true, data: result.data };
  return {
    valid: false,
    errors: result.error.errors.map(e => `[${e.path.join('.')}] ${e.message}`),
  };
}

export const NDISSchemas = {
  CaseNote: CaseNoteSchema,
  Practitioner: PractitionerSchema,
  BillingRecord: BillingRecordSchema,
};