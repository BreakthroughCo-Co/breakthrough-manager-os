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
import BIPQualityAudit from './pages/BIPQualityAudit';
import BSPCreator from './pages/BSPCreator';
import Billing from './pages/Billing';
import CapabilityAssessment from './pages/CapabilityAssessment';
import CaseNotes from './pages/CaseNotes';
import ClientCommunications from './pages/ClientCommunications';
import ClientFeedback from './pages/ClientFeedback';
import Clients from './pages/Clients';
import ClinicalHub from './pages/ClinicalHub';
import Compliance from './pages/Compliance';
import Dashboard from './pages/Dashboard';
import FBAAssessment from './pages/FBAAssessment';
import Integrations from './pages/Integrations';
import Messages from './pages/Messages';
import NDISCalculator from './pages/NDISCalculator';
import NDISPlans from './pages/NDISPlans';
import PlanUtilisation from './pages/PlanUtilisation';
import PractitionerDetail from './pages/PractitionerDetail';
import Practitioners from './pages/Practitioners';
import Programs from './pages/Programs';
import Reports from './pages/Reports';
import RestrictivePractices from './pages/RestrictivePractices';
import RiskAssessmentTool from './pages/RiskAssessmentTool';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import ServiceAgreements from './pages/ServiceAgreements';
import Settings from './pages/Settings';
import SocialStories from './pages/SocialStories';
import StaffInduction from './pages/StaffInduction';
import Tasks from './pages/Tasks';
import WorkerScreening from './pages/WorkerScreening';
import WorkflowTriggers from './pages/WorkflowTriggers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ABCAnalyser": ABCAnalyser,
    "AIAssistant": AIAssistant,
    "BIPQualityAudit": BIPQualityAudit,
    "BSPCreator": BSPCreator,
    "Billing": Billing,
    "CapabilityAssessment": CapabilityAssessment,
    "CaseNotes": CaseNotes,
    "ClientCommunications": ClientCommunications,
    "ClientFeedback": ClientFeedback,
    "Clients": Clients,
    "ClinicalHub": ClinicalHub,
    "Compliance": Compliance,
    "Dashboard": Dashboard,
    "FBAAssessment": FBAAssessment,
    "Integrations": Integrations,
    "Messages": Messages,
    "NDISCalculator": NDISCalculator,
    "NDISPlans": NDISPlans,
    "PlanUtilisation": PlanUtilisation,
    "PractitionerDetail": PractitionerDetail,
    "Practitioners": Practitioners,
    "Programs": Programs,
    "Reports": Reports,
    "RestrictivePractices": RestrictivePractices,
    "RiskAssessmentTool": RiskAssessmentTool,
    "RootCauseAnalysis": RootCauseAnalysis,
    "ServiceAgreements": ServiceAgreements,
    "Settings": Settings,
    "SocialStories": SocialStories,
    "StaffInduction": StaffInduction,
    "Tasks": Tasks,
    "WorkerScreening": WorkerScreening,
    "WorkflowTriggers": WorkflowTriggers,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};