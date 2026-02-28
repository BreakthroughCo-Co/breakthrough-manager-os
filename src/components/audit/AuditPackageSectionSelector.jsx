import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme/ThemeContext';
import { cn } from '@/lib/utils';

const SECTIONS = [
    { id: 'compliance', label: 'Compliance Register', description: 'All compliance items and statuses' },
    { id: 'incidents', label: 'Incident Register', description: 'All reported incidents' },
    { id: 'restrictive_practices', label: 'Restrictive Practices', description: 'Authorisations, consent, NDIS notifications' },
    { id: 'bsps', label: 'Behaviour Support Plans', description: 'BSP records with lifecycle stage' },
    { id: 'worker_screening', label: 'Worker Screening', description: 'NDIS Worker Screening Check statuses' },
    { id: 'training', label: 'Training Records', description: 'Staff training completions and outcomes' },
    { id: 'risk_assessments', label: 'Risk Assessments', description: 'Risk register entries' },
    { id: 'clients', label: 'Participant Register', description: 'Active and historical participant records' },
    { id: 'practitioners', label: 'Practitioner Register', description: 'Staff records and registration details' },
    { id: 'audit_log', label: 'System Audit Log', description: 'Immutable system event trail' },
];

export default function AuditPackageSectionSelector({ selected, onChange }) {
    const { isDark } = useTheme();

    const toggle = (id) => {
        onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
    };

    const toggleAll = () => {
        onChange(selected.length === SECTIONS.length ? [] : SECTIONS.map(s => s.id));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
                <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>
                    Select Evidence Sections
                </span>
                <button onClick={toggleAll} className={cn("text-xs underline", isDark ? "text-teal-400" : "text-teal-600")}>
                    {selected.length === SECTIONS.length ? 'Deselect all' : 'Select all'}
                </button>
            </div>
            {SECTIONS.map(section => (
                <div
                    key={section.id}
                    onClick={() => toggle(section.id)}
                    className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selected.includes(section.id)
                            ? isDark ? "border-teal-600 bg-teal-900/20" : "border-teal-500 bg-teal-50"
                            : isDark ? "border-slate-700 hover:border-slate-600" : "border-slate-200 hover:border-slate-300"
                    )}
                >
                    <Checkbox
                        checked={selected.includes(section.id)}
                        onCheckedChange={() => toggle(section.id)}
                        className="mt-0.5 pointer-events-none"
                    />
                    <div>
                        <p className={cn("text-sm font-medium", isDark ? "text-slate-100" : "text-slate-800")}>{section.label}</p>
                        <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>{section.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export { SECTIONS };