import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { audit_report_id } = await req.json();

    // Get audit report
    const reports = await base44.asServiceRole.entities.ComplianceAuditReport.filter({ 
      id: audit_report_id 
    });
    const report = reports[0];

    if (!report) {
      return Response.json({ error: 'Audit report not found' }, { status: 404 });
    }

    const findings = JSON.parse(report.findings || '[]');
    const highSeverityFindings = findings.filter(f => f.severity === 'high' || f.severity === 'critical');

    if (highSeverityFindings.length === 0) {
      return Response.json({ 
        message: 'No high-severity findings requiring training',
        assignments: []
      });
    }

    // Map findings to training categories
    const findingToCategory = {
      'documentation': 'NDIS Compliance',
      'restrictive practice': 'Behaviour Support',
      'consent': 'Policy & Procedure',
      'incident': 'Safety & Risk',
      'reporting': 'NDIS Compliance',
    };

    const requiredCategories = new Set();
    highSeverityFindings.forEach(finding => {
      const desc = finding.description.toLowerCase();
      Object.keys(findingToCategory).forEach(keyword => {
        if (desc.includes(keyword)) {
          requiredCategories.add(findingToCategory[keyword]);
        }
      });
    });

    // Get training modules for identified gaps
    const modules = await base44.asServiceRole.entities.TrainingModule.filter({ 
      status: 'active' 
    });
    
    const relevantModules = modules.filter(m => 
      Array.from(requiredCategories).includes(m.category)
    );

    if (relevantModules.length === 0) {
      return Response.json({ 
        message: 'No training modules match identified gaps',
        assignments: []
      });
    }

    // Get all active practitioners
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({ 
      status: 'active' 
    });

    const assignments = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10); // 10 days for urgent training

    // Assign to all practitioners (can be refined based on finding specifics)
    for (const module of relevantModules) {
      for (const practitioner of practitioners) {
        // Check if already assigned
        const existing = await base44.asServiceRole.entities.TrainingAssignment.filter({
          practitioner_id: practitioner.id,
          module_id: module.id,
          completion_status: 'not_started'
        });

        if (existing.length === 0) {
          const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
            practitioner_id: practitioner.id,
            practitioner_name: practitioner.full_name,
            practitioner_email: practitioner.email,
            module_id: module.id,
            module_name: module.module_name,
            assignment_reason: 'compliance_gap',
            assigned_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            assigned_by: 'system',
            notes: `Auto-assigned due to compliance audit findings (Report: ${report.audit_name})`,
          });
          assignments.push(assignment);
        }
      }
    }

    return Response.json({
      audit_name: report.audit_name,
      high_severity_findings: highSeverityFindings.length,
      modules_assigned: relevantModules.length,
      practitioners_assigned: assignments.length,
      assignments
    });
  } catch (error) {
    console.error('Auto-assign gap training error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});