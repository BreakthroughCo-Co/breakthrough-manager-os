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
import AIAssistant from './pages/AIAssistant';
import AgentManagement from './pages/AgentManagement';
import BIPQualityAudit from './pages/BIPQualityAudit';
import BSPCreator from './pages/BSPCreator';
import Billing from './pages/Billing';
import CapabilityAssessment from './pages/CapabilityAssessment';
import CaseNotes from './pages/CaseNotes';
import ClientCommunications from './pages/ClientCommunications';
import ClientDetail from './pages/ClientDetail';
import ClientFeedback from './pages/ClientFeedback';
import ClientIntake from './pages/ClientIntake';
import ClientPortal from './pages/ClientPortal';
import Clients from './pages/Clients';
import ClinicalHub from './pages/ClinicalHub';
import CommunicationHub from './pages/CommunicationHub';
import Compliance from './pages/Compliance';
import ComplianceAuditCenter from './pages/ComplianceAuditCenter';
import ComplianceReadiness from './pages/ComplianceReadiness';
import CustomDashboard from './pages/CustomDashboard';
import Dashboard from './pages/Dashboard';
import FBAAssessment from './pages/FBAAssessment';
import HybridIntelligence from './pages/HybridIntelligence';
import Integrations from './pages/Integrations';
import Messages from './pages/Messages';
import NDISCalculator from './pages/NDISCalculator';
import NDISPlans from './pages/NDISPlans';
import ObservabilityDashboard from './pages/ObservabilityDashboard';
import PlanUtilisation from './pages/PlanUtilisation';
import PractitionerAnalytics from './pages/PractitionerAnalytics';
import PractitionerDetail from './pages/PractitionerDetail';
import PractitionerOnboarding from './pages/PractitionerOnboarding';
import Practitioners from './pages/Practitioners';
import Programs from './pages/Programs';
import Reports from './pages/Reports';
import RestrictivePractices from './pages/RestrictivePractices';
import RiskAssessmentTool from './pages/RiskAssessmentTool';
import RiskMonitoring from './pages/RiskMonitoring';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import ServiceAgreements from './pages/ServiceAgreements';
import Settings from './pages/Settings';
import SocialStories from './pages/SocialStories';
import StaffInduction from './pages/StaffInduction';
import StaffTraining from './pages/StaffTraining';
import TaskQueue from './pages/TaskQueue';
import Tasks from './pages/Tasks';
import WorkerScreening from './pages/WorkerScreening';
import WorkflowTriggers from './pages/WorkflowTriggers';
import ComplianceBreachManagement from './pages/ComplianceBreachManagement';
import StaffPerformance from './pages/StaffPerformance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ABCAnalyser": ABCAnalyser,
    "AIAssistant": AIAssistant,
    "AgentManagement": AgentManagement,
    "BIPQualityAudit": BIPQualityAudit,
    "BSPCreator": BSPCreator,
    "Billing": Billing,
    "CapabilityAssessment": CapabilityAssessment,
    "CaseNotes": CaseNotes,
    "ClientCommunications": ClientCommunications,
    "ClientDetail": ClientDetail,
    "ClientFeedback": ClientFeedback,
    "ClientIntake": ClientIntake,
    "ClientPortal": ClientPortal,
    "Clients": Clients,
    "ClinicalHub": ClinicalHub,
    "CommunicationHub": CommunicationHub,
    "Compliance": Compliance,
    "ComplianceAuditCenter": ComplianceAuditCenter,
    "ComplianceReadiness": ComplianceReadiness,
    "CustomDashboard": CustomDashboard,
    "Dashboard": Dashboard,
    "FBAAssessment": FBAAssessment,
    "HybridIntelligence": HybridIntelligence,
    "Integrations": Integrations,
    "Messages": Messages,
    "NDISCalculator": NDISCalculator,
    "NDISPlans": NDISPlans,
    "ObservabilityDashboard": ObservabilityDashboard,
    "PlanUtilisation": PlanUtilisation,
    "PractitionerAnalytics": PractitionerAnalytics,
    "PractitionerDetail": PractitionerDetail,
    "PractitionerOnboarding": PractitionerOnboarding,
    "Practitioners": Practitioners,
    "Programs": Programs,
    "Reports": Reports,
    "RestrictivePractices": RestrictivePractices,
    "RiskAssessmentTool": RiskAssessmentTool,
    "RiskMonitoring": RiskMonitoring,
    "RootCauseAnalysis": RootCauseAnalysis,
    "ServiceAgreements": ServiceAgreements,
    "Settings": Settings,
    "SocialStories": SocialStories,
    "StaffInduction": StaffInduction,
    "StaffTraining": StaffTraining,
    "TaskQueue": TaskQueue,
    "Tasks": Tasks,
    "WorkerScreening": WorkerScreening,
    "WorkflowTriggers": WorkflowTriggers,
    "ComplianceBreachManagement": ComplianceBreachManagement,
    "StaffPerformance": StaffPerformance,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};