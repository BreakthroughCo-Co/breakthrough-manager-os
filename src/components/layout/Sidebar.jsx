import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Calculator,
  DollarSign,
  Boxes,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Settings,
  Building2,
  MessageSquare,
  Zap,
  FileText,
  Brain,
  Calendar,
  ClipboardCheck,
  Briefcase,
  Activity,
  FileSearch,
  BookOpen,
  AlertTriangle,
  UserCog,
  ScrollText,
  Star,
  Gauge,
  Lock,
  Link2,
  TrendingUp,
  BarChart3,
  Bot,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Safe hook wrapper with fallback
function useSafeTheme() {
  try {
    return useTheme();
  } catch {
    return { isDark: false };
  }
}

const mainNavItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Practitioners', icon: UserCheck, page: 'Practitioners' },
  { name: 'Clients', icon: Users, page: 'Clients' },
  { name: 'Billing', icon: DollarSign, page: 'Billing' },
  { name: 'Tasks', icon: ListTodo, page: 'Tasks' },
  { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  { name: 'Communications', icon: MessageSquare, page: 'ClientCommunications' },
];

const clinicalItems = [
  { name: 'Clinical Hub', icon: Brain, page: 'ClinicalHub' },
  { name: 'FBA Assessment', icon: FileSearch, page: 'FBAAssessment' },
  { name: 'ABC Data & Analysis', icon: Activity, page: 'ABCAnalyser' },
  { name: 'BSP Creator', icon: ScrollText, page: 'BSPCreator' },
  { name: 'Social Stories', icon: BookOpen, page: 'SocialStories' },
  { name: 'Root Cause Analysis', icon: AlertTriangle, page: 'RootCauseAnalysis' },
  { name: 'Restrictive Practices', icon: Lock, page: 'RestrictivePractices' },
  { name: 'Capability Assessment', icon: Gauge, page: 'CapabilityAssessment' },
];

const complianceItems = [
  { name: 'Compliance Hub', icon: Shield, page: 'Compliance' },
  { name: 'Compliance Automation', icon: Zap, page: 'ComplianceAutomation', managerOnly: true },
  { name: 'Risk Assessment', icon: AlertTriangle, page: 'RiskAssessmentTool' },
  { name: 'BIP Quality Audit', icon: ClipboardCheck, page: 'BIPQualityAudit' },
  { name: 'Case Notes', icon: FileText, page: 'CaseNotes' },
  { name: 'Worker Screening', icon: UserCog, page: 'WorkerScreening', managerOnly: true },
  { name: 'Client Feedback', icon: Star, page: 'ClientFeedback' },
];

const adminItems = [
  { name: 'Command Center', icon: BarChart3, page: 'CommandCenter' },
  { name: 'NDIS Plans', icon: FileText, page: 'NDISPlans' },
  { name: 'Plan Utilisation', icon: Gauge, page: 'PlanUtilisation' },
  { name: 'Service Agreements', icon: ScrollText, page: 'ServiceAgreements' },
  { name: 'Staff Induction', icon: UserCog, page: 'StaffInduction', managerOnly: true },
  { name: 'Staff Training', icon: BookOpen, page: 'StaffTraining' },
  { name: 'Team Training Intelligence', icon: Brain, page: 'TeamTrainingManagement' },
  { name: 'Practitioner Skill Matrix', icon: TrendingUp, page: 'PractitionerSkillManagement' },
  { name: 'Mentorship Program', icon: Users, page: 'MentorshipProgram' },
  { name: 'Staff Performance', icon: TrendingUp, page: 'StaffPerformance' },
  { name: 'Practitioner Onboarding', icon: UserCheck, page: 'PractitionerOnboarding', managerOnly: true },
  { name: 'Client Transitions', icon: Calendar, page: 'ClientTransitions' },
  { name: 'Incident Analysis', icon: AlertTriangle, page: 'IncidentAnalysis' },
  { name: 'Programs', icon: Boxes, page: 'Programs' },
  { name: 'Comprehensive Reports', icon: BarChart3, page: 'ComprehensiveReports' },
  { name: 'Automated Reports', icon: FileText, page: 'AutomatedReports' },
  { name: 'AI Scheduling', icon: Calendar, page: 'AISchedulingOptimizer' },
  { name: 'Reports', icon: FileText, page: 'Reports' },
  { name: 'Case Management', icon: Briefcase, page: 'CaseManagement' },
  { name: 'Client Outreach', icon: MessageSquare, page: 'ClientOutreach' },
  { name: 'Custom Dashboard', icon: LayoutDashboard, page: 'CustomDashboard' },
  { name: 'Workflows', icon: Zap, page: 'WorkflowTriggers' },
  { name: 'Agents', icon: Bot, page: 'AgentManagement' },
];

const toolItems = [
  { name: 'Calculator', icon: Calculator, page: 'NDISCalculator' },
  { name: 'AI Assistant', icon: Sparkles, page: 'AIAssistant' },
  { name: 'Intelligence Hub', icon: Brain, page: 'IntelligenceHub' },
  { name: 'Proactive Alerts', icon: Bell, page: 'ProactiveAlerts', managerOnly: true },
  { name: 'Client Portal', icon: Users, page: 'ClientPortal' },
  { name: 'Communication Hub', icon: MessageSquare, page: 'CommunicationHub' },
  { name: 'Integrations', icon: Link2, page: 'Integrations' },
];

export default function Sidebar({ currentPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const { isDark } = useSafeTheme();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserRole(user.role || 'user');
      } catch (e) {}
    };
    loadUser();

    // Auto-expand based on current page
    if (clinicalItems.some(i => i.page === currentPage)) setClinicalOpen(true);
    if (complianceItems.some(i => i.page === currentPage)) setComplianceOpen(true);
    if (adminItems.some(i => i.page === currentPage)) setAdminOpen(true);
  }, [currentPage]);

  const isManager = userRole === 'admin';

  const renderNavItem = (item, isActive) => {
    if (item.managerOnly && !isManager) return null;
    
    return (
      <Link
        key={item.name}
        to={createPageUrl(item.page)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm",
          isActive
            ? isDark
              ? "bg-teal-500/20 text-teal-400"
              : "bg-teal-500/10 text-teal-600"
            : isDark
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "scale-110")} />
        {!collapsed && <span className="font-medium truncate">{item.name}</span>}
      </Link>
    );
  };

  const renderCollapsibleSection = (title, items, isOpen, setIsOpen, Icon) => (
    <Collapsible open={!collapsed && isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
            isDark
              ? "text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50",
            collapsed && "justify-center px-2"
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="font-medium text-sm flex-1 text-left">{title}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
        {items.map((item) => renderNavItem(item, currentPage === item.page))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r z-50 transition-all duration-300 flex flex-col",
        isDark
          ? "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800/50"
          : "bg-gradient-to-b from-white to-slate-50 border-slate-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center px-4 transition-colors duration-300",
        isDark ? "border-b border-slate-800/50" : "border-b border-slate-200",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className={cn(
              "font-semibold text-sm leading-tight transition-colors duration-300",
              isDark ? "text-white" : "text-slate-900"
            )}>Breakthrough</span>
            <span className={cn(
              "text-xs transition-colors duration-300",
              isDark ? "text-slate-400" : "text-slate-500"
            )}>Manager OS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 px-3 space-y-1 overflow-y-auto transition-colors duration-300",
        isDark ? "bg-transparent" : "bg-transparent"
      )}>
        {/* Main Navigation */}
        {mainNavItems.map((item) => renderNavItem(item, currentPage === item.page))}
        
        <div className={cn(
          "my-3 border-t transition-colors duration-300",
          isDark ? "border-slate-800/50" : "border-slate-300/50"
        )} />
        
        {/* Clinical Suite */}
        {renderCollapsibleSection('Clinical', clinicalItems, clinicalOpen, setClinicalOpen, Brain)}
        
        {/* Compliance Suite */}
        {renderCollapsibleSection('Compliance', complianceItems, complianceOpen, setComplianceOpen, Shield)}
        
        {/* Admin Suite */}
        {renderCollapsibleSection('Admin', adminItems, adminOpen, setAdminOpen, Briefcase)}
        
        <div className={cn(
          "my-3 border-t transition-colors duration-300",
          isDark ? "border-slate-800/50" : "border-slate-300/50"
        )} />
        
        {/* Tools */}
        {toolItems.map((item) => renderNavItem(item, currentPage === item.page))}
      </nav>

      {/* Settings */}
      <div className={cn(
        "p-3 border-t transition-colors duration-300",
        isDark ? "border-slate-800/50" : "border-slate-200"
      )}>
        <Link
          to={createPageUrl('Settings')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
            isDark
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full border transition-all",
          isDark
            ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            : "bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-300"
        )}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </Button>
    </aside>
  );
}