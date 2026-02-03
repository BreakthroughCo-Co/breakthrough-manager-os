import { base44 } from '@/api/base44Client';

/**
 * Event-driven workflow system
 * Emits system events that trigger workflow automations
 */

class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Emit a system event
   */
  async emit(eventType, entityType, entityId, payload = {}) {
    try {
      const user = await base44.auth.me();
      
      // Store event in database
      const event = await base44.entities.SystemEvent.create({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        triggered_by: user.email,
        payload: JSON.stringify(payload),
        status: 'pending',
      });

      // Process workflow triggers
      await this.processWorkflowTriggers(event);

      // Notify local listeners
      this.notifyListeners(eventType, { entityType, entityId, payload });

      return event;
    } catch (error) {
      console.error('Failed to emit event:', error);
    }
  }

  /**
   * Process workflow triggers for this event
   */
  async processWorkflowTriggers(event) {
    try {
      // Fetch matching workflow triggers
      const triggers = await base44.entities.WorkflowTrigger.filter({
        is_active: true,
        entity_type: event.entity_type,
      });

      const executedTriggers = [];

      for (const trigger of triggers) {
        // Check if event type matches trigger condition
        if (this.matchesTrigger(event, trigger)) {
          await this.executeTrigger(trigger, event);
          executedTriggers.push(trigger.id);
        }
      }

      // Update event with executed triggers
      await base44.entities.SystemEvent.update(event.id, {
        status: 'completed',
        processed_at: new Date().toISOString(),
        workflow_triggers_executed: JSON.stringify(executedTriggers),
      });
    } catch (error) {
      console.error('Failed to process workflow triggers:', error);
      await base44.entities.SystemEvent.update(event.id, {
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  /**
   * Check if event matches trigger conditions
   */
  matchesTrigger(event, trigger) {
    const eventData = JSON.parse(event.payload);
    
    // Map event types to trigger types
    const eventTypeMap = {
      'bsp.approved': 'compliance_status',
      'bsp.published': 'compliance_status',
      'client.plan_expiring': 'plan_expiry',
      'funding.threshold_reached': 'funding_threshold',
      'task.overdue': 'task_overdue',
    };

    const triggerType = eventTypeMap[event.event_type];
    return trigger.trigger_type === triggerType;
  }

  /**
   * Execute a workflow trigger action
   */
  async executeTrigger(trigger, event) {
    const actionConfig = trigger.action_config ? JSON.parse(trigger.action_config) : {};
    const eventPayload = JSON.parse(event.payload);

    try {
      switch (trigger.action_type) {
        case 'create_task':
          await base44.entities.Task.create({
            title: actionConfig.title || `${trigger.name}`,
            description: actionConfig.description || `Auto-generated from ${event.event_type}`,
            category: actionConfig.category || 'Compliance',
            priority: actionConfig.priority || 'high',
            status: 'pending',
            related_entity_type: event.entity_type,
            related_entity_id: event.entity_id,
          });
          break;

        case 'send_notification':
          // Future: integrate with notification system
          console.log('Notification:', actionConfig.message);
          break;

        case 'update_status':
          if (event.entity_type && event.entity_id) {
            await base44.entities[event.entity_type].update(event.entity_id, {
              [actionConfig.field]: actionConfig.value,
            });
          }
          break;

        case 'send_email':
          // Future: integrate with email system
          console.log('Email:', actionConfig);
          break;
      }

      // Update trigger last_triggered
      await base44.entities.WorkflowTrigger.update(trigger.id, {
        last_triggered: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to execute trigger ${trigger.id}:`, error);
    }
  }

  /**
   * Register local event listener (for UI updates)
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Unregister listener
   */
  off(eventType, callback) {
    if (!this.listeners.has(eventType)) return;
    const callbacks = this.listeners.get(eventType);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Notify local listeners
   */
  notifyListeners(eventType, data) {
    if (!this.listeners.has(eventType)) return;
    const callbacks = this.listeners.get(eventType);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

// Singleton instance
export const eventEmitter = new EventEmitter();

/**
 * Common event helpers
 */
export const emitEvent = {
  bspApproved: (bspId, data) => 
    eventEmitter.emit('bsp.approved', 'BehaviourSupportPlan', bspId, data),
  
  bspPublished: (bspId, data) => 
    eventEmitter.emit('bsp.published', 'BehaviourSupportPlan', bspId, data),
  
  clientCreated: (clientId, data) => 
    eventEmitter.emit('client.created', 'Client', clientId, data),
  
  planExpiring: (clientId, data) => 
    eventEmitter.emit('client.plan_expiring', 'Client', clientId, data),
  
  fundingThreshold: (clientId, data) => 
    eventEmitter.emit('funding.threshold_reached', 'Client', clientId, data),
  
  taskOverdue: (taskId, data) => 
    eventEmitter.emit('task.overdue', 'Task', taskId, data),
};