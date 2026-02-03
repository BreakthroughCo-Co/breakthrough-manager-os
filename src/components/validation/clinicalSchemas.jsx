import { z } from 'zod';

/**
 * Zod schemas for clinical documents
 * Enforce data quality and compliance at the boundary
 */

// Behaviour Support Plan Schema
export const BehaviourSupportPlanSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  client_name: z.string().min(1, 'Client name is required'),
  fba_id: z.string().optional(),
  plan_version: z.string().default('1.0'),
  status: z.enum(['draft', 'pending_approval', 'approved', 'active', 'under_review', 'archived']),
  start_date: z.string().min(1, 'Start date is required'),
  review_date: z.string().optional(),
  author_id: z.string().optional(),
  author_name: z.string().optional(),
  participant_profile: z.string().min(20, 'Participant profile must be at least 20 characters'),
  behaviour_summary: z.string().min(50, 'Behaviour summary must be at least 50 characters'),
  functional_analysis: z.string().min(50, 'Functional analysis is required'),
  environmental_strategies: z.string().min(30, 'Environmental strategies required'),
  skill_building_strategies: z.string().min(30, 'Skill building strategies required'),
  reactive_strategies: z.string().min(30, 'Reactive strategies required'),
  restrictive_practices: z.string().optional(),
  monitoring_evaluation: z.string().min(30, 'Monitoring plan required'),
  implementation_support: z.string().min(30, 'Implementation support plan required'),
  consent_obtained: z.boolean(),
  consent_date: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  if (data.consent_obtained && !data.consent_date) {
    return false;
  }
  return true;
}, {
  message: 'Consent date required when consent is obtained',
  path: ['consent_date'],
});

// Case Note Schema (SOAP format)
export const CaseNoteSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  client_name: z.string().min(1, 'Client name is required'),
  practitioner_id: z.string().min(1, 'Practitioner is required'),
  practitioner_name: z.string().min(1, 'Practitioner name is required'),
  session_date: z.string().min(1, 'Session date is required'),
  session_type: z.enum(['direct_support', 'assessment', 'plan_development', 'review', 'consultation', 'training']),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  location: z.string().optional(),
  subjective: z.string().min(20, 'Subjective notes must be at least 20 characters'),
  objective: z.string().min(20, 'Objective observations must be at least 20 characters'),
  assessment: z.string().min(20, 'Assessment must be at least 20 characters'),
  plan: z.string().min(20, 'Plan must be at least 20 characters'),
  refined_note: z.string().optional(),
  goals_addressed: z.string().optional(),
  progress_rating: z.enum(['regression', 'no_change', 'emerging', 'progressing', 'achieved']).optional(),
  status: z.enum(['draft', 'completed', 'reviewed']),
  notes: z.string().optional(),
});

// Risk Assessment Schema
export const RiskAssessmentSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  assessor_name: z.string().min(1, 'Assessor name is required'),
  risk_title: z.string().min(5, 'Risk title must be at least 5 characters'),
  risk_category: z.enum(['safety', 'clinical', 'operational', 'compliance', 'reputational', 'financial']),
  risk_description: z.string().min(20, 'Risk description must be at least 20 characters'),
  likelihood: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain']),
  consequence: z.enum(['insignificant', 'minor', 'moderate', 'major', 'catastrophic']),
  inherent_risk_level: z.enum(['low', 'medium', 'high', 'extreme']),
  existing_controls: z.string().min(10, 'Existing controls must be documented'),
  residual_likelihood: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain']),
  residual_consequence: z.enum(['insignificant', 'minor', 'moderate', 'major', 'catastrophic']),
  residual_risk_level: z.enum(['low', 'medium', 'high', 'extreme']),
  additional_controls: z.string().optional(),
  responsible_person: z.string().optional(),
  review_date: z.string().optional(),
  status: z.enum(['identified', 'mitigated', 'monitoring', 'closed']),
  notes: z.string().optional(),
});

// Functional Behaviour Assessment Schema
export const FBASchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  client_name: z.string().min(1, 'Client name is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  assessor_id: z.string().optional(),
  assessor_name: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'reviewed']),
  referral_reason: z.string().min(20, 'Referral reason must be at least 20 characters'),
  background_history: z.string().min(50, 'Background history required'),
  current_supports: z.string().min(20, 'Current supports must be documented'),
  target_behaviours: z.string().min(30, 'Target behaviours must be described'),
  setting_events: z.string().optional(),
  antecedents: z.string().min(20, 'Antecedents must be identified'),
  consequences: z.string().min(20, 'Consequences must be identified'),
  hypothesised_function: z.enum(['escape_avoidance', 'attention', 'tangible', 'sensory', 'multiple']),
  function_evidence: z.string().min(30, 'Evidence for function hypothesis required'),
  replacement_behaviours: z.string().min(20, 'Replacement behaviours must be suggested'),
  recommendations: z.string().min(30, 'Recommendations required'),
  notes: z.string().optional(),
});

/**
 * Validation helper
 */
export const validateSchema = (schema, data) => {
  try {
    schema.parse(data);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      valid: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
};

/**
 * Get schema by entity type
 */
export const getSchemaForEntity = (entityType) => {
  const schemas = {
    BehaviourSupportPlan: BehaviourSupportPlanSchema,
    CaseNote: CaseNoteSchema,
    RiskAssessment: RiskAssessmentSchema,
    FunctionalBehaviourAssessment: FBASchema,
  };
  return schemas[entityType];
};