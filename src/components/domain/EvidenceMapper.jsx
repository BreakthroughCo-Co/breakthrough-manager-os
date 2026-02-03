/**
 * Evidence-to-Decision Mapping System
 * Enforces: Behaviour → Hypothesis → Intervention → Outcome → Evidence
 */

export class EvidenceMapper {
  /**
   * Build evidence chain for a clinical decision
   */
  static buildEvidenceChain(behaviour, hypothesis, intervention, outcome) {
    return {
      chain_id: this.generateChainId(),
      behaviour: {
        behaviour_id: behaviour.id,
        description: behaviour.description,
        operational_definition: behaviour.operational_definition,
        baseline_data: behaviour.baseline_data,
        abc_records: behaviour.linked_abc_records || [],
      },
      hypothesis: {
        hypothesis_id: hypothesis.id,
        function: hypothesis.function,
        statement: hypothesis.statement,
        supporting_evidence: hypothesis.supporting_evidence || [],
        confidence: hypothesis.confidence_level,
      },
      intervention: {
        intervention_id: intervention.id,
        description: intervention.description,
        rationale: intervention.rationale,
        evidence_base: intervention.evidence_base,
        implementation_fidelity: null,
      },
      outcome: {
        outcome_id: outcome.id,
        metric_name: outcome.metric_name,
        measurement_method: outcome.measurement_method,
        target_value: outcome.target_value,
        actual_value: null,
        achievement_status: null,
      },
      chain_status: 'planned',
      created_date: new Date().toISOString(),
    };
  }

  /**
   * Validate evidence chain integrity
   */
  static validateChain(chain) {
    const errors = [];

    if (!chain.behaviour.abc_records || chain.behaviour.abc_records.length === 0) {
      errors.push('Behaviour must be supported by ABC records');
    }

    if (!chain.hypothesis.supporting_evidence || chain.hypothesis.supporting_evidence.length === 0) {
      errors.push('Hypothesis must cite supporting evidence');
    }

    if (!chain.intervention.rationale || 
        !chain.intervention.rationale.includes(chain.hypothesis.function)) {
      errors.push('Intervention must explicitly link to hypothesis');
    }

    if (!chain.outcome.metric_name || !chain.outcome.measurement_method) {
      errors.push('Intervention must define measurable outcome');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate BSP intervention structure
   */
  static validateBSPIntervention(intervention, abcRecords, hypothesis) {
    const errors = [];
    
    // Must reference ABC clusters
    if (!intervention.linked_abc_clusters || intervention.linked_abc_clusters.length === 0) {
      errors.push('Intervention must reference ABC data clusters');
    }
    
    // Must link to hypothesis
    if (!intervention.linked_hypothesis) {
      errors.push('Intervention must link to functional hypothesis');
    }
    
    // Must have outcome metric
    if (!intervention.outcome_metric || !intervention.outcome_metric.metric_name) {
      errors.push('Intervention must define outcome metric');
    }
    
    // Validate ABC cluster references exist
    if (intervention.linked_abc_clusters) {
      const validClusters = intervention.linked_abc_clusters.filter(clusterId =>
        abcRecords.some(abc => abc.id === clusterId)
      );
      if (validClusters.length !== intervention.linked_abc_clusters.length) {
        errors.push('Some referenced ABC records do not exist');
      }
    }
    
    // Validate hypothesis reference exists
    if (intervention.linked_hypothesis && hypothesis) {
      if (hypothesis.hypothesis_id !== intervention.linked_hypothesis) {
        errors.push('Linked hypothesis does not match provided hypothesis');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if ABC records support hypothesis
   */
  static analyzeABCSupport(abcRecords, hypothesis) {
    const functionMap = {
      escape_avoidance: ['escape_granted', 'demand'],
      attention: ['attention_provided', 'social'],
      tangible: ['tangible_obtained'],
      sensory: ['sensory_maintained', 'sensory'],
    };

    const expectedPatterns = functionMap[hypothesis.function] || [];
    const supportingRecords = abcRecords.filter(record => {
      const consequenceMatch = expectedPatterns.some(pattern =>
        record.consequence?.category?.includes(pattern)
      );
      const antecedentMatch = expectedPatterns.some(pattern =>
        record.antecedent?.category?.includes(pattern)
      );
      return consequenceMatch || antecedentMatch;
    });

    const supportRatio = supportingRecords.length / abcRecords.length;

    return {
      total_records: abcRecords.length,
      supporting_records: supportingRecords.length,
      support_ratio: supportRatio,
      confidence: supportRatio > 0.7 ? 'high' : supportRatio > 0.4 ? 'medium' : 'low',
      supporting_record_ids: supportingRecords.map(r => r.id),
    };
  }

  static generateChainId() {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}