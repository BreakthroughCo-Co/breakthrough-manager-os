import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Temporal Automation: Check Time-Based Triggers
 * Runs daily to check for upcoming/overdue reviews
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const now = new Date();
    const reviews = [];

    // Check BSP mandatory reviews (12-month cycle)
    const bsps = await base44.asServiceRole.entities.BehaviourSupportPlan.filter({
      lifecycle_stage: 'published',
    });

    for (const bsp of bsps) {
      const effectiveDate = new Date(bsp.effective_date);
      const monthsSince = (now - effectiveDate) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsSince >= 12) {
        const existing = await base44.asServiceRole.entities.ScheduledReview.filter({
          entity_id: bsp.id,
          review_type: 'bsp_mandatory',
          status: 'pending',
        });

        if (existing.length === 0) {
          const review = await base44.asServiceRole.entities.ScheduledReview.create({
            review_type: 'bsp_mandatory',
            entity_type: 'BehaviourSupportPlan',
            entity_id: bsp.id,
            entity_name: `${bsp.client_name} BSP Review`,
            due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assigned_to: bsp.author_name,
            priority: 'overdue',
            status: 'pending',
          });
          reviews.push(review);
        }
      }
    }

    // Check consent expiry
    const serviceAgreements = await base44.asServiceRole.entities.ServiceAgreement.filter({
      status: 'active',
    });

    for (const sa of serviceAgreements) {
      if (sa.consent_date) {
        const consentDate = new Date(sa.consent_date);
        const yearsSince = (now - consentDate) / (1000 * 60 * 60 * 24 * 365);
        
        if (yearsSince >= 1) {
          const review = await base44.asServiceRole.entities.ScheduledReview.create({
            review_type: 'consent_renewal',
            entity_type: 'ServiceAgreement',
            entity_id: sa.id,
            entity_name: `${sa.client_name} Consent Renewal`,
            due_date: new Date().toISOString().split('T')[0],
            assigned_to: sa.assigned_practitioner_name,
            priority: 'urgent',
            status: 'pending',
          });
          reviews.push(review);
        }
      }
    }

    // Check worker screening expiry
    const practitioners = await base44.asServiceRole.entities.Practitioner.filter({
      status: 'active',
    });

    const screenings = await base44.asServiceRole.entities.WorkerScreening.list();
    
    for (const screening of screenings) {
      const expiryDate = new Date(screening.expiry_date);
      const daysUntil = (expiryDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntil <= 60 && daysUntil > 0) {
        const review = await base44.asServiceRole.entities.ScheduledReview.create({
          review_type: 'worker_screening',
          entity_type: 'WorkerScreening',
          entity_id: screening.id,
          entity_name: `${screening.worker_name} Screening Renewal`,
          due_date: screening.expiry_date,
          assigned_to: 'admin',
          priority: daysUntil <= 30 ? 'urgent' : 'upcoming',
          status: 'pending',
        });
        reviews.push(review);
      }
    }

    // Check plan rollover forecasting (90 days ahead)
    const clients = await base44.asServiceRole.entities.Client.filter({
      status: 'active',
    });

    for (const client of clients) {
      if (client.plan_end_date) {
        const planEnd = new Date(client.plan_end_date);
        const daysUntil = (planEnd - now) / (1000 * 60 * 60 * 24);
        
        if (daysUntil <= 90 && daysUntil > 0) {
          const existing = await base44.asServiceRole.entities.ScheduledReview.filter({
            entity_id: client.id,
            review_type: 'plan_rollover',
            status: 'pending',
          });

          if (existing.length === 0) {
            const review = await base44.asServiceRole.entities.ScheduledReview.create({
              review_type: 'plan_rollover',
              entity_type: 'Client',
              entity_id: client.id,
              entity_name: `${client.full_name} Plan Rollover`,
              due_date: new Date(planEnd.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              assigned_to: client.assigned_practitioner_name,
              priority: daysUntil <= 45 ? 'urgent' : 'upcoming',
              status: 'pending',
            });
            reviews.push(review);
          }
        }
      }
    }

    // Update days_until_due for all pending reviews
    const allPending = await base44.asServiceRole.entities.ScheduledReview.filter({
      status: 'pending',
    });

    for (const review of allPending) {
      const dueDate = new Date(review.due_date);
      const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      let priority = 'scheduled';
      if (daysUntil < 0) priority = 'overdue';
      else if (daysUntil <= 7) priority = 'urgent';
      else if (daysUntil <= 30) priority = 'upcoming';

      await base44.asServiceRole.entities.ScheduledReview.update(review.id, {
        days_until_due: daysUntil,
        priority,
      });
    }

    return Response.json({
      success: true,
      new_reviews: reviews.length,
      total_pending: allPending.length,
    });
  } catch (error) {
    console.error('Temporal check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});