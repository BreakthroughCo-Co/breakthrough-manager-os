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
import AdvancedReporting from './pages/AdvancedReporting';
import AgentManagement from './pages/AgentManagement';
import AuditEvidencePackage from './pages/AuditEvidencePackage';
import AuditReadiness from './pages/AuditReadiness';
import AutomatedOutreach from './pages/AutomatedOutreach';
import AutomatedReports from './pages/AutomatedReports';
import BIPQualityAudit from './pages/BIPQualityAudit';
import BSPCreator from './pages/BSPCreator';
import Billing from './pages/Billing';
import CalendarSync from './pages/CalendarSync';
import CapabilityAssessment from './pages/CapabilityAssessment';
import CaseManagement from './pages/CaseManagement';
import CaseNotes from './pages/CaseNotes';
import ClientCommunications from './pages/ClientCommunications';
import ClientDetail from './pages/ClientDetail';
import ClientDisengagementRiskDashboard from './pages/ClientDisengagementRiskDashboard';
import ClientFeedback from './pages/ClientFeedback';
import ClientForm from './pages/ClientForm';
import ClientGoalReview from './pages/ClientGoalReview';
import ClientIntake from './pages/ClientIntake';
import ClientJourneyAnalytics from './pages/ClientJourneyAnalytics';
import ClientOutcomePrediction from './pages/ClientOutcomePrediction';
import ClientOutcomesTracking from './pages/ClientOutcomesTracking';
import ClientOutreach from './pages/ClientOutreach';
import ClientPortal from './pages/ClientPortal';
import ClientProgressReports from './pages/ClientProgressReports';
import ClientRiskManagement from './pages/ClientRiskManagement';
import ClientTransitions from './pages/ClientTransitions';
import Clients from './pages/Clients';
import ClinicalHub from './pages/ClinicalHub';
import CommandCenter from './pages/CommandCenter';
import CommunicationHub from './pages/CommunicationHub';
import Compliance from './pages/Compliance';
import ComplianceAuditCenter from './pages/ComplianceAuditCenter';
import ComplianceAuditor from './pages/ComplianceAuditor';
import ComplianceAutomation from './pages/ComplianceAutomation';
import ComplianceBreachManagement from './pages/ComplianceBreachManagement';
import ComplianceCenter from './pages/ComplianceCenter';
import ComplianceMonitoring from './pages/ComplianceMonitoring';
import ComplianceReadiness from './pages/ComplianceReadiness';
import ComplianceTrainingManagement from './pages/ComplianceTrainingManagement';
import ComprehensiveReports from './pages/ComprehensiveReports';
import CustomDashboard from './pages/CustomDashboard';
import Dashboard from './pages/Dashboard';
import DocumentProcessing from './pages/DocumentProcessing';
import ExecutiveBrief from './pages/ExecutiveBrief';
import FBAAssessment from './pages/FBAAssessment';
import FinancialOperations from './pages/FinancialOperations';
import FinancialReconciliation from './pages/FinancialReconciliation';
import HybridIntelligence from './pages/HybridIntelligence';
import IncidentAnalysis from './pages/IncidentAnalysis';
import IncidentDetection from './pages/IncidentDetection';
import IncidentRegister from './pages/IncidentRegister';
import IntakePipeline from './pages/IntakePipeline';
import Integrations from './pages/Integrations';
import IntelligenceHub from './pages/IntelligenceHub';
import KnowledgeBase from './pages/KnowledgeBase';
import LEGOTransformativePlay from './pages/LEGOTransformativePlay';
import ManagerDashboard from './pages/ManagerDashboard';
import MentorshipProgram from './pages/MentorshipProgram';
import Messages from './pages/Messages';
import NDISCalculator from './pages/NDISCalculator';
import NDISComplianceDashboard from './pages/NDISComplianceDashboard';
import NDISPlanManagement from './pages/NDISPlanManagement';
import NDISPlans from './pages/NDISPlans';
import NDISPricing from './pages/NDISPricing';
import ObservabilityDashboard from './pages/ObservabilityDashboard';
import PlanUtilisation from './pages/PlanUtilisation';
import PractitionerAnalytics from './pages/PractitionerAnalytics';
import PractitionerCaseloadRebalancer from './pages/PractitionerCaseloadRebalancer';
import PractitionerCompliance from './pages/PractitionerCompliance';
import PractitionerDetail from './pages/PractitionerDetail';
import PractitionerDevelopment from './pages/PractitionerDevelopment';
import PractitionerDevelopmentCenter from './pages/PractitionerDevelopmentCenter';
import PractitionerMatching from './pages/PractitionerMatching';
import PractitionerOnboarding from './pages/PractitionerOnboarding';
import PractitionerPerformance from './pages/PractitionerPerformance';
import PractitionerSkillManagement from './pages/PractitionerSkillManagement';
import PractitionerWellbeing from './pages/PractitionerWellbeing';
import Practitioners from './pages/Practitioners';
import ProactiveAlerts from './pages/ProactiveAlerts';
import Programs from './pages/Programs';
import ReportDistribution from './pages/ReportDistribution';
import Reports from './pages/Reports';
import ResourceAllocationOptimizer from './pages/ResourceAllocationOptimizer';
import ResourceManagement from './pages/ResourceManagement';
import RestrictivePractices from './pages/RestrictivePractices';
import RiskAssessmentTool from './pages/RiskAssessmentTool';
import RiskManagement from './pages/RiskManagement';
import RiskMonitoring from './pages/RiskMonitoring';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import ServiceAgreements from './pages/ServiceAgreements';
import ServiceReports from './pages/ServiceReports';
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
import TrainingAutomation from './pages/TrainingAutomation';
import TrainingViewer from './pages/TrainingViewer';
import WorkerScreening from './pages/WorkerScreening';
import WorkflowTriggers from './pages/WorkflowTriggers';
import WorkloadManagement from './pages/WorkloadManagement';
import XeroFinancialHub from './pages/XeroFinancialHub';
import ResourceLibrary from './pages/ResourceLibrary';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ABCAnalyser": ABCAnalyser,
    "AIAdminHub": AIAdminHub,
    "AIAssistant": AIAssistant,
    "AISchedulingOptimizer": AISchedulingOptimizer,
    "AdvancedReporting": AdvancedReporting,
    "AgentManagement": AgentManagement,
    "AuditEvidencePackage": AuditEvidencePackage,
    "AuditReadiness": AuditReadiness,
    "AutomatedOutreach": AutomatedOutreach,
    "AutomatedReports": AutomatedReports,
    "BIPQualityAudit": BIPQualityAudit,
    "BSPCreator": BSPCreator,
    "Billing": Billing,
    "CalendarSync": CalendarSync,
    "CapabilityAssessment": CapabilityAssessment,
    "CaseManagement": CaseManagement,
    "CaseNotes": CaseNotes,
    "ClientCommunications": ClientCommunications,
    "ClientDetail": ClientDetail,
    "ClientDisengagementRiskDashboard": ClientDisengagementRiskDashboard,
    "ClientFeedback": ClientFeedback,
    "ClientForm": ClientForm,
    "ClientGoalReview": ClientGoalReview,
    "ClientIntake": ClientIntake,
    "ClientJourneyAnalytics": ClientJourneyAnalytics,
    "ClientOutcomePrediction": ClientOutcomePrediction,
    "ClientOutcomesTracking": ClientOutcomesTracking,
    "ClientOutreach": ClientOutreach,
    "ClientPortal": ClientPortal,
    "ClientProgressReports": ClientProgressReports,
    "ClientRiskManagement": ClientRiskManagement,
    "ClientTransitions": ClientTransitions,
    "Clients": Clients,
    "ClinicalHub": ClinicalHub,
    "CommandCenter": CommandCenter,
    "CommunicationHub": CommunicationHub,
    "Compliance": Compliance,
    "ComplianceAuditCenter": ComplianceAuditCenter,
    "ComplianceAuditor": ComplianceAuditor,
    "ComplianceAutomation": ComplianceAutomation,
    "ComplianceBreachManagement": ComplianceBreachManagement,
    "ComplianceCenter": ComplianceCenter,
    "ComplianceMonitoring": ComplianceMonitoring,
    "ComplianceReadiness": ComplianceReadiness,
    "ComplianceTrainingManagement": ComplianceTrainingManagement,
    "ComprehensiveReports": ComprehensiveReports,
    "CustomDashboard": CustomDashboard,
    "Dashboard": Dashboard,
    "DocumentProcessing": DocumentProcessing,
    "ExecutiveBrief": ExecutiveBrief,
    "FBAAssessment": FBAAssessment,
    "FinancialOperations": FinancialOperations,
    "FinancialReconciliation": FinancialReconciliation,
    "HybridIntelligence": HybridIntelligence,
    "IncidentAnalysis": IncidentAnalysis,
    "IncidentDetection": IncidentDetection,
    "IncidentRegister": IncidentRegister,
    "IntakePipeline": IntakePipeline,
    "Integrations": Integrations,
    "IntelligenceHub": IntelligenceHub,
    "KnowledgeBase": KnowledgeBase,
    "LEGOTransformativePlay": LEGOTransformativePlay,
    "ManagerDashboard": ManagerDashboard,
    "MentorshipProgram": MentorshipProgram,
    "Messages": Messages,
    "NDISCalculator": NDISCalculator,
    "NDISComplianceDashboard": NDISComplianceDashboard,
    "NDISPlanManagement": NDISPlanManagement,
    "NDISPlans": NDISPlans,
    "NDISPricing": NDISPricing,
    "ObservabilityDashboard": ObservabilityDashboard,
    "PlanUtilisation": PlanUtilisation,
    "PractitionerAnalytics": PractitionerAnalytics,
    "PractitionerCaseloadRebalancer": PractitionerCaseloadRebalancer,
    "PractitionerCompliance": PractitionerCompliance,
    "PractitionerDetail": PractitionerDetail,
    "PractitionerDevelopment": PractitionerDevelopment,
    "PractitionerDevelopmentCenter": PractitionerDevelopmentCenter,
    "PractitionerMatching": PractitionerMatching,
    "PractitionerOnboarding": PractitionerOnboarding,
    "PractitionerPerformance": PractitionerPerformance,
    "PractitionerSkillManagement": PractitionerSkillManagement,
    "PractitionerWellbeing": PractitionerWellbeing,
    "Practitioners": Practitioners,
    "ProactiveAlerts": ProactiveAlerts,
    "Programs": Programs,
    "ReportDistribution": ReportDistribution,
    "Reports": Reports,
    "ResourceAllocationOptimizer": ResourceAllocationOptimizer,
    "ResourceManagement": ResourceManagement,
    "RestrictivePractices": RestrictivePractices,
    "RiskAssessmentTool": RiskAssessmentTool,
    "RiskManagement": RiskManagement,
    "RiskMonitoring": RiskMonitoring,
    "RootCauseAnalysis": RootCauseAnalysis,
    "ServiceAgreements": ServiceAgreements,
    "ServiceReports": ServiceReports,
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
    "TrainingAutomation": TrainingAutomation,
    "TrainingViewer": TrainingViewer,
    "WorkerScreening": WorkerScreening,
    "WorkflowTriggers": WorkflowTriggers,
    "WorkloadManagement": WorkloadManagement,
    "XeroFinancialHub": XeroFinancialHub,
    "ResourceLibrary": ResourceLibrary,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};