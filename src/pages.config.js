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
import AIAssistant from './pages/AIAssistant';
import Billing from './pages/Billing';
import Clients from './pages/Clients';
import Compliance from './pages/Compliance';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import NDISCalculator from './pages/NDISCalculator';
import PractitionerDetail from './pages/PractitionerDetail';
import Practitioners from './pages/Practitioners';
import Programs from './pages/Programs';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import WorkflowTriggers from './pages/WorkflowTriggers';
import ClinicalHub from './pages/ClinicalHub';
import FBAAssessment from './pages/FBAAssessment';
import ABCAnalyser from './pages/ABCAnalyser';
import BSPCreator from './pages/BSPCreator';
import SocialStories from './pages/SocialStories';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "Billing": Billing,
    "Clients": Clients,
    "Compliance": Compliance,
    "Dashboard": Dashboard,
    "Messages": Messages,
    "NDISCalculator": NDISCalculator,
    "PractitionerDetail": PractitionerDetail,
    "Practitioners": Practitioners,
    "Programs": Programs,
    "Reports": Reports,
    "Settings": Settings,
    "Tasks": Tasks,
    "WorkflowTriggers": WorkflowTriggers,
    "ClinicalHub": ClinicalHub,
    "FBAAssessment": FBAAssessment,
    "ABCAnalyser": ABCAnalyser,
    "BSPCreator": BSPCreator,
    "SocialStories": SocialStories,
    "RootCauseAnalysis": RootCauseAnalysis,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};