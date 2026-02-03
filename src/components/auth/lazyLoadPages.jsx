import { lazy } from 'react';

// Lazy load all pages for better performance
export const lazyPages = {
  // Dashboard
  Dashboard: lazy(() => import('@/pages/Dashboard')),
  
  // Clients & Clinical
  Clients: lazy(() => import('@/pages/Clients')),
  CaseNotes: lazy(() => import('@/pages/CaseNotes')),
  FBAAssessment: lazy(() => import('@/pages/FBAAssessment')),
  BSPCreator: lazy(() => import('@/pages/BSPCreator')),
  SocialStories: lazy(() => import('@/pages/SocialStories')),
  RestrictivePractices: lazy(() => import('@/pages/RestrictivePractices')),
  RootCauseAnalysis: lazy(() => import('@/pages/RootCauseAnalysis')),
  CapabilityAssessment: lazy(() => import('@/pages/CapabilityAssessment')),
  ABCAnalyser: lazy(() => import('@/pages/ABCAnalyser')),
  ClinicalHub: lazy(() => import('@/pages/ClinicalHub')),
  
  // Practitioners
  Practitioners: lazy(() => import('@/pages/Practitioners')),
  PractitionerDetail: lazy(() => import('@/pages/PractitionerDetail')),
  
  // Compliance
  Compliance: lazy(() => import('@/pages/Compliance')),
  WorkerScreening: lazy(() => import('@/pages/WorkerScreening')),
  BIPQualityAudit: lazy(() => import('@/pages/BIPQualityAudit')),
  RiskAssessmentTool: lazy(() => import('@/pages/RiskAssessmentTool')),
  
  // Admin & Operations
  NDISPlans: lazy(() => import('@/pages/NDISPlans')),
  PlanUtilisation: lazy(() => import('@/pages/PlanUtilisation')),
  ServiceAgreements: lazy(() => import('@/pages/ServiceAgreements')),
  StaffInduction: lazy(() => import('@/pages/StaffInduction')),
  Programs: lazy(() => import('@/pages/Programs')),
  Reports: lazy(() => import('@/pages/Reports')),
  CustomDashboard: lazy(() => import('@/pages/CustomDashboard')),
  WorkflowTriggers: lazy(() => import('@/pages/WorkflowTriggers')),
  
  // Finance
  Billing: lazy(() => import('@/pages/Billing')),
  NDISCalculator: lazy(() => import('@/pages/NDISCalculator')),
  
  // Communication & Tools
  Messages: lazy(() => import('@/pages/Messages')),
  ClientCommunications: lazy(() => import('@/pages/ClientCommunications')),
  ClientFeedback: lazy(() => import('@/pages/ClientFeedback')),
  AIAssistant: lazy(() => import('@/pages/AIAssistant')),
  
  // Settings & Configuration
  Settings: lazy(() => import('@/pages/Settings')),
  Integrations: lazy(() => import('@/pages/Integrations')),
  Tasks: lazy(() => import('@/pages/Tasks')),
};

// Role-based page permissions
export const pagePermissions = {
  // Admin-only pages
  StaffInduction: ['admin'],
  WorkflowTriggers: ['admin'],
  Integrations: ['admin'],
  
  // Manager pages (admin access)
  Reports: ['admin'],
  CustomDashboard: ['admin'],
  Programs: ['admin'],
  Billing: ['admin'],
  
  // Clinical tools - all authenticated users
  // (empty array means any authenticated user)
};

// Pages that don't require authentication
export const publicPages = [];