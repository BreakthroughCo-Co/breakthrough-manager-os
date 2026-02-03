/**
 * Canonical Clinical Artefact Base Model
 * All clinical documents inherit from this base structure
 */

export const ClinicalArtefactBase = {
  version: {
    type: 'string',
    required: true,
    description: 'Semantic version (e.g., 1.0, 2.1)',
  },
  version_number: {
    type: 'number',
    required: true,
    description: 'Incremental version counter',
  },
  author: {
    type: 'object',
    required: true,
    properties: {
      id: 'string',
      name: 'string',
      email: 'string',
      registration_number: 'string',
      role: 'string',
    },
  },
  approver: {
    type: 'object',
    required: false,
    properties: {
      id: 'string',
      name: 'string',
      email: 'string',
      approved_date: 'date-time',
    },
  },
  evidence_links: {
    type: 'array',
    required: true,
    description: 'Links to supporting evidence (ABC records, assessments, etc.)',
    items: {
      type: 'object',
      properties: {
        evidence_type: 'string', // 'abc_record', 'assessment', 'case_note', 'incident_report'
        evidence_id: 'string',
        evidence_date: 'date',
        relevance: 'string',
      },
    },
  },
  ndis_standard_refs: {
    type: 'array',
    required: true,
    description: 'NDIS Practice Standards this artefact addresses',
    items: {
      type: 'object',
      properties: {
        standard_code: 'string', // e.g., '1A', '3A'
        standard_name: 'string',
        requirement: 'string',
        how_addressed: 'string',
      },
    },
  },
  effective_date: {
    type: 'date-time',
    required: true,
    description: 'When this artefact becomes effective',
  },
  supersedes: {
    type: 'string',
    required: false,
    description: 'ID of the artefact this replaces',
  },
  lifecycle_stage: {
    type: 'string',
    enum: ['draft', 'review', 'approved', 'published', 'superseded', 'archived'],
    required: true,
  },
  published_date: {
    type: 'date-time',
    required: false,
    description: 'When published (immutable)',
  },
};

/**
 * Validate artefact against canonical model
 */
export const validateArtefact = (artefact, schema) => {
  const errors = [];
  
  // Check required base fields
  if (!artefact.version) errors.push('version is required');
  if (!artefact.author) errors.push('author is required');
  if (!artefact.evidence_links || artefact.evidence_links.length === 0) {
    errors.push('evidence_links is required');
  }
  if (!artefact.ndis_standard_refs || artefact.ndis_standard_refs.length === 0) {
    errors.push('ndis_standard_refs is required');
  }
  if (!artefact.effective_date) errors.push('effective_date is required');
  
  return {
    valid: errors.length === 0,
    errors,
  };
};