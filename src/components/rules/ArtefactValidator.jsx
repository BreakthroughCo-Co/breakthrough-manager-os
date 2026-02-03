/**
 * Deterministic Artefact Detection
 * Detects missing or incomplete clinical documents
 */

export class ArtefactValidator {
  /**
   * Check client for missing artefacts
   */
  static detectMissingArtefacts(client, artefacts = {}) {
    const missing = [];
    const {
      fbas = [],
      bsps = [],
      serviceAgreements = [],
      riskAssessments = [],
      caseNotes = [],
      abcRecords = [],
    } = artefacts;

    // Rule: Behaviour Support clients must have FBA
    if (client.service_type?.includes('Behaviour Support')) {
      const hasCompletedFBA = fbas.some(f => 
        f.client_id === client.id && f.status === 'completed'
      );
      if (!hasCompletedFBA) {
        missing.push({
          artefact_type: 'FBA',
          rule: 'PBS_REQUIRES_FBA',
          severity: 'critical',
          message: 'Behaviour Support service requires Functional Behaviour Assessment',
          action: 'Create FBA',
        });
      }
    }

    // Rule: FBA must lead to BSP within 60 days
    const completedFBA = fbas.find(f => 
      f.client_id === client.id && f.status === 'completed'
    );
    if (completedFBA) {
      const hasLinkedBSP = bsps.some(b => 
        b.client_id === client.id && 
        b.fba_id === completedFBA.id &&
        (b.status === 'active' || b.lifecycle_stage === 'published')
      );
      
      if (!hasLinkedBSP) {
        const fbaDate = new Date(completedFBA.assessment_date);
        const daysSinceFBA = (new Date() - fbaDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceFBA > 60) {
          missing.push({
            artefact_type: 'BSP',
            rule: 'FBA_REQUIRES_BSP',
            severity: 'critical',
            message: `FBA completed ${Math.round(daysSinceFBA)} days ago without BSP`,
            action: 'Create BSP from FBA',
          });
        }
      }
    }

    // Rule: Active client must have service agreement
    const hasActiveAgreement = serviceAgreements.some(sa =>
      sa.client_id === client.id && sa.status === 'active'
    );
    if (!hasActiveAgreement && client.status === 'active') {
      missing.push({
        artefact_type: 'ServiceAgreement',
        rule: 'ACTIVE_REQUIRES_AGREEMENT',
        severity: 'high',
        message: 'Active client missing service agreement',
        action: 'Create service agreement',
      });
    }

    // Rule: High risk clients must have current risk assessment
    if (client.risk_level === 'high') {
      const recentRiskAssessment = riskAssessments.find(ra =>
        ra.client_id === client.id &&
        new Date(ra.assessment_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      
      if (!recentRiskAssessment) {
        missing.push({
          artefact_type: 'RiskAssessment',
          rule: 'HIGH_RISK_REQUIRES_ASSESSMENT',
          severity: 'critical',
          message: 'High-risk client requires risk assessment within 90 days',
          action: 'Conduct risk assessment',
        });
      }
    }

    // Rule: Minimum case note frequency (1 per month for active clients)
    if (client.status === 'active') {
      const recentCaseNotes = caseNotes.filter(cn =>
        cn.client_id === client.id &&
        new Date(cn.session_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      
      if (recentCaseNotes.length === 0) {
        missing.push({
          artefact_type: 'CaseNote',
          rule: 'MONTHLY_CASE_NOTE_REQUIRED',
          severity: 'medium',
          message: 'No case notes recorded in last 30 days',
          action: 'Document recent sessions',
        });
      }
    }

    // Rule: BSP requires ongoing ABC data
    const activeBSP = bsps.find(b =>
      b.client_id === client.id &&
      b.lifecycle_stage === 'published'
    );
    
    if (activeBSP) {
      const recentABC = abcRecords.filter(abc =>
        abc.client_id === client.id &&
        new Date(abc.date) > new Date(activeBSP.published_date)
      );
      
      if (recentABC.length < 2) {
        missing.push({
          artefact_type: 'ABCRecord',
          rule: 'BSP_REQUIRES_ONGOING_DATA',
          severity: 'medium',
          message: 'Active BSP requires ongoing ABC data collection',
          action: 'Record ABC observations',
        });
      }
    }

    return {
      has_missing: missing.length > 0,
      missing_count: missing.length,
      critical_count: missing.filter(m => m.severity === 'critical').length,
      missing_artefacts: missing,
    };
  }

  /**
   * Validate artefact completeness
   */
  static validateArtefactCompleteness(artefact, type) {
    const incomplete = [];

    switch (type) {
      case 'BSP':
        if (!artefact.participant_profile || artefact.participant_profile.length < 50) {
          incomplete.push('Participant profile insufficient (min 50 characters)');
        }
        if (!artefact.functional_analysis || artefact.functional_analysis.length < 50) {
          incomplete.push('Functional analysis insufficient');
        }
        if (!artefact.environmental_strategies) {
          incomplete.push('Environmental strategies missing');
        }
        if (!artefact.skill_building_strategies) {
          incomplete.push('Skill building strategies missing');
        }
        if (!artefact.reactive_strategies) {
          incomplete.push('Reactive strategies missing');
        }
        if (!artefact.monitoring_evaluation) {
          incomplete.push('Monitoring plan missing');
        }
        break;

      case 'FBA':
        if (!artefact.referral_reason) {
          incomplete.push('Referral reason missing');
        }
        if (!artefact.target_behaviours) {
          incomplete.push('Target behaviours not defined');
        }
        if (!artefact.hypothesised_function) {
          incomplete.push('Functional hypothesis missing');
        }
        if (!artefact.recommendations) {
          incomplete.push('Recommendations missing');
        }
        break;

      case 'RiskAssessment':
        if (!artefact.risk_description) {
          incomplete.push('Risk description missing');
        }
        if (!artefact.existing_controls) {
          incomplete.push('Existing controls not documented');
        }
        if (!artefact.residual_risk_level) {
          incomplete.push('Residual risk level not assessed');
        }
        break;
    }

    return {
      complete: incomplete.length === 0,
      issues: incomplete,
    };
  }

  /**
   * Check document review schedule adherence
   */
  static checkReviewSchedule(artefacts) {
    const overdue = [];

    artefacts.forEach(artefact => {
      if (artefact.review_date) {
        const reviewDate = new Date(artefact.review_date);
        if (reviewDate < new Date()) {
          overdue.push({
            artefact_id: artefact.id,
            artefact_type: artefact.type,
            client_name: artefact.client_name,
            review_date: artefact.review_date,
            days_overdue: Math.floor((new Date() - reviewDate) / (1000 * 60 * 60 * 24)),
          });
        }
      }
    });

    return {
      has_overdue: overdue.length > 0,
      overdue_count: overdue.length,
      overdue_reviews: overdue,
    };
  }
}