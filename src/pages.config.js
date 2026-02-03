/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ABCAnalyser from './pages/ABCAnalyser';
import AIAdminHub from './pages/AIAdminHub';
import AIAssistant from './pages/AIAssistant';
import AISchedulingOptimizer from './pages/AISchedulingOptimizer';
import AgentManagement from './pages/AgentManagement';
import AutomatedReports from './pages/AutomatedReports';
import BIPQualityAudit from './pages/BIPQualityAudit';
import BSPCreator from './pages/BSPCreator';
import Billing from './pages/Billing';
import CapabilityAssessment from './pages/CapabilityAssessment';
import CaseManagement from './pages/CaseManagement';
import CaseNotes from './pages/CaseNotes';
import ClientCommunications from './pages/ClientCommunications';
import ClientDetail from './pages/ClientDetail';
import ClientDisengagementRiskDashboard from './pages/ClientDisengagementRiskDashboard';
import ClientFeedback from './pages/ClientFeedback';
import ClientGoalReview from './pages/ClientGoalReview';
import ClientIntake from './pages/ClientIntake';
import ClientOutcomePrediction from './pages/ClientOutcomePrediction';
import ClientOutreach from './pages/ClientOutreach';
import ClientPortal from './pages/ClientPortal';
import ClientProgressReports from './pages/ClientProgressReports';
import ClientRiskManagement from './pages/ClientRiskManagement';
import ClientTransitions from './pages/ClientTransitions';
import Clients from './pages/Clients';
import ClinicalHub from './pages/ClinicalHub';
import CommunicationHub from './pages/CommunicationHub';
import Compliance from './pages/Compliance';
import ComplianceAuditCenter from './pages/ComplianceAuditCenter';
import ComplianceBreachManagement from './pages/ComplianceBreachManagement';
import ComplianceCenter from './pages/ComplianceCenter';
import ComplianceReadiness from './pages/ComplianceReadiness';
import ComplianceTrainingManagement from './pages/ComplianceTrainingManagement';
import ComprehensiveReports from './pages/ComprehensiveReports';
import CustomDashboard from './pages/CustomDashboard';
import Dashboard from './pages/Dashboard';
import DocumentProcessing from './pages/DocumentProcessing';
import FBAAssessment from './pages/FBAAssessment';
import FinancialOperations from './pages/FinancialOperations';
import HybridIntelligence from './pages/HybridIntelligence';
import IncidentDetection from './pages/IncidentDetection';
import Integrations from './pages/Integrations';
import LEGOTransformativePlay from './pages/LEGOTransformativePlay';
import Messages from './pages/Messages';
import NDISCalculator from './pages/NDISCalculator';
import NDISComplianceDashboard from './pages/NDISComplianceDashboard';
import NDISPlanManagement from './pages/NDISPlanManagement';
import NDISPlans from './pages/NDISPlans';
import NDISPricing from './pages/NDISPricing';
import ObservabilityDashboard from './pages/ObservabilityDashboard';
import PlanUtilisation from './pages/PlanUtilisation';
import PractitionerAnalytics from './pages/PractitionerAnalytics';
import PractitionerDetail from './pages/PractitionerDetail';
import PractitionerDevelopment from './pages/PractitionerDevelopment';
import PractitionerDevelopmentCenter from './pages/PractitionerDevelopmentCenter';
import PractitionerMatching from './pages/PractitionerMatching';
import PractitionerOnboarding from './pages/PractitionerOnboarding';
import PractitionerPerformance from './pages/PractitionerPerformance';
import PractitionerSkillManagement from './pages/PractitionerSkillManagement';
import Practitioners from './pages/Practitioners';
import Programs from './pages/Programs';
import ReportDistribution from './pages/ReportDistribution';
import Reports from './pages/Reports';
import ResourceAllocationOptimizer from './pages/ResourceAllocationOptimizer';
import RestrictivePractices from './pages/RestrictivePractices';
import RiskAssessmentTool from './pages/RiskAssessmentTool';
import RiskMonitoring from './pages/RiskMonitoring';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import ServiceAgreements from './pages/ServiceAgreements';
import SessionLogs from './pages/SessionLogs';
import SessionSupport from './pages/SessionSupport';
import Settings from './pages/Settings';
import SocialStories from './pages/SocialStories';
import StaffInduction from './pages/StaffInduction';
import StaffPerformance from './pages/StaffPerformance';
import StaffTraining from './pages/StaffTraining';
import TaskQueue from './pages/TaskQueue';
import Tasks from './pages/Tasks';
import TeamDevelopment from './pages/TeamDevelopment';
import TeamTrainingManagement from './pages/TeamTrainingManagement';
import WorkerScreening from './pages/WorkerScreening';
import WorkflowTriggers from './pages/WorkflowTriggers';
import WorkloadManagement from './pages/WorkloadManagement';
import MentorshipProgram from './pages/MentorshipProgram';
import CommandCenter from './pages/CommandCenter';
import IncidentAnalysis from './pages/IncidentAnalysis';
import ClientForm from './pages/ClientForm';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ABCAnalyser": ABCAnalyser,
    "AIAdminHub": AIAdminHub,
    "AIAssistant": AIAssistant,
    "AISchedulingOptimizer": AISchedulingOptimizer,
    "AgentManagement": AgentManagement,
    "AutomatedReports": AutomatedReports,
    "BIPQualityAudit": BIPQualityAudit,
    "BSPCreator": BSPCreator,
    "Billing": Billing,
    "CapabilityAssessment": CapabilityAssessment,
    "CaseManagement": CaseManagement,
    "CaseNotes": CaseNotes,
    "ClientCommunications": ClientCommunications,
    "ClientDetail": ClientDetail,
    "ClientDisengagementRiskDashboard": ClientDisengagementRiskDashboard,
    "ClientFeedback": ClientFeedback,
    "ClientGoalReview": ClientGoalReview,
    "ClientIntake": ClientIntake,
    "ClientOutcomePrediction": ClientOutcomePrediction,
    "ClientOutreach": ClientOutreach,
    "ClientPortal": ClientPortal,
    "ClientProgressReports": ClientProgressReports,
    "ClientRiskManagement": ClientRiskManagement,
    "ClientTransitions": ClientTransitions,
    "Clients": Clients,
    "ClinicalHub": ClinicalHub,
    "CommunicationHub": CommunicationHub,
    "Compliance": Compliance,
    "ComplianceAuditCenter": ComplianceAuditCenter,
    "ComplianceBreachManagement": ComplianceBreachManagement,
    "ComplianceCenter": ComplianceCenter,
    "ComplianceReadiness": ComplianceReadiness,
    "ComplianceTrainingManagement": ComplianceTrainingManagement,
    "ComprehensiveReports": ComprehensiveReports,
    "CustomDashboard": CustomDashboard,
    "Dashboard": Dashboard,
    "DocumentProcessing": DocumentProcessing,
    "FBAAssessment": FBAAssessment,
    "FinancialOperations": FinancialOperations,
    "HybridIntelligence": HybridIntelligence,
    "IncidentDetection": IncidentDetection,
    "Integrations": Integrations,
    "LEGOTransformativePlay": LEGOTransformativePlay,
    "Messages": Messages,
    "NDISCalculator": NDISCalculator,
    "NDISComplianceDashboard": NDISComplianceDashboard,
    "NDISPlanManagement": NDISPlanManagement,
    "NDISPlans": NDISPlans,
    "NDISPricing": NDISPricing,
    "ObservabilityDashboard": ObservabilityDashboard,
    "PlanUtilisation": PlanUtilisation,
    "PractitionerAnalytics": PractitionerAnalytics,
    "PractitionerDetail": PractitionerDetail,
    "PractitionerDevelopment": PractitionerDevelopment,
    "PractitionerDevelopmentCenter": PractitionerDevelopmentCenter,
    "PractitionerMatching": PractitionerMatching,
    "PractitionerOnboarding": PractitionerOnboarding,
    "PractitionerPerformance": PractitionerPerformance,
    "PractitionerSkillManagement": PractitionerSkillManagement,
    "Practitioners": Practitioners,
    "Programs": Programs,
    "ReportDistribution": ReportDistribution,
    "Reports": Reports,
    "ResourceAllocationOptimizer": ResourceAllocationOptimizer,
    "RestrictivePractices": RestrictivePractices,
    "RiskAssessmentTool": RiskAssessmentTool,
    "RiskMonitoring": RiskMonitoring,
    "RootCauseAnalysis": RootCauseAnalysis,
    "ServiceAgreements": ServiceAgreements,
    "SessionLogs": SessionLogs,
    "SessionSupport": SessionSupport,
    "Settings": Settings,
    "SocialStories": SocialStories,
    "StaffInduction": StaffInduction,
    "StaffPerformance": StaffPerformance,
    "StaffTraining": StaffTraining,
    "TaskQueue": TaskQueue,
    "Tasks": Tasks,
    "TeamDevelopment": TeamDevelopment,
    "TeamTrainingManagement": TeamTrainingManagement,
    "WorkerScreening": WorkerScreening,
    "WorkflowTriggers": WorkflowTriggers,
    "WorkloadManagement": WorkloadManagement,
    "MentorshipProgram": MentorshipProgram,
    "CommandCenter": CommandCenter,
    "IncidentAnalysis": IncidentAnalysis,
    "ClientForm": ClientForm,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};