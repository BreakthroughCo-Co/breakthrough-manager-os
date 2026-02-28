import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Clock, Award, CheckCircle2, XCircle, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-700',
};

const CATEGORY_COLORS = {
  'NDIS Compliance':   'bg-blue-100 text-blue-700',
  'Behaviour Support': 'bg-purple-100 text-purple-700',
  'Documentation':     'bg-teal-100 text-teal-700',
  'Risk Management':   'bg-red-100 text-red-700',
  'Communication':     'bg-amber-100 text-amber-700',
  'Clinical Skills':   'bg-emerald-100 text-emerald-700',
};

function QuizRunner({ module }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  let questions = [];
  try { questions = JSON.parse(module.quiz_questions || '[]'); } catch {}

  if (!questions.length) {
    return <p className="text-sm text-slate-400 italic">No quiz available for this module.</p>;
  }

  const handleAnswer = (qIdx, answer) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: answer }));
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  const passed = score !== null && score >= (module.passing_score || 80);

  return (
    <div className="space-y-5">
      {submitted && (
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-xl border",
          passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        )}>
          {passed
            ? <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
          <div className="flex-1">
            <p className={cn("font-semibold", passed ? "text-emerald-700" : "text-red-700")}>
              {passed ? 'Passed' : 'Not Passed'} — {score}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Passing score: {module.passing_score || 80}%
              {module.cpd_hours && passed && ` · ${module.cpd_hours} CPD hours earned`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3 h-3" /> Retry
          </Button>
        </div>
      )}

      {questions.map((q, qIdx) => {
        const userAnswer = answers[qIdx];
        const isCorrect = submitted && userAnswer === q.correct_answer;
        const isWrong = submitted && userAnswer !== q.correct_answer;

        return (
          <div key={qIdx} className="space-y-2">
            <p className="text-sm font-medium">{qIdx + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {(q.options || []).map((opt, oIdx) => {
                const isSelected = userAnswer === opt;
                const isCorrectOpt = submitted && opt === q.correct_answer;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleAnswer(qIdx, opt)}
                    className={cn(
                      "w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                      isCorrectOpt ? "bg-emerald-50 border-emerald-400 text-emerald-700" :
                      (isSelected && isWrong) ? "bg-red-50 border-red-400 text-red-700" :
                      isSelected ? "border-teal-500 bg-teal-50 text-teal-700" :
                      "border-slate-200 hover:border-slate-400"
                    )}
                  >
                    {opt}
                    {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 inline ml-2 text-emerald-500" />}
                    {isSelected && isWrong && <XCircle className="w-3.5 h-3.5 inline ml-2 text-red-500" />}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="text-xs text-slate-500 pl-2 border-l-2 border-slate-300">{q.explanation}</p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="bg-teal-600 hover:bg-teal-700 w-full"
        >
          Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
        </Button>
      )}
    </div>
  );
}

export default function TrainingViewer() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeTab, setActiveTab] = useState('content');

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.filter({ is_active: true }),
  });

  const filtered = useMemo(() => {
    return modules.filter(m => {
      const matchSearch = !search || m.module_name?.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [modules, search, categoryFilter]);

  return (
    <div className={cn("flex gap-6 h-[calc(100vh-140px)]", isDark ? "text-slate-50" : "text-slate-900")}>
      {/* Left: Module List */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" /> Training Modules
          </h2>
          <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            NDIS compliance and practice skill development
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search modules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(CATEGORY_COLORS).map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {filtered.length === 0 && !isLoading && (
            <p className={cn("text-xs text-center py-8", isDark ? "text-slate-500" : "text-slate-400")}>No modules found</p>
          )}
          {filtered.map(module => {
            let quizCount = 0;
            try { quizCount = JSON.parse(module.quiz_questions || '[]').length; } catch {}
            return (
              <button
                key={module.id}
                onClick={() => { setSelectedModule(module); setActiveTab('content'); }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedModule?.id === module.id
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                    : isDark
                      ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <p className="text-sm font-medium leading-tight">{module.module_name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge className={cn("text-xs", CATEGORY_COLORS[module.category] || 'bg-slate-100 text-slate-600')}>
                    {module.category}
                  </Badge>
                  <Badge className={cn("text-xs", DIFFICULTY_COLORS[module.difficulty_level] || 'bg-slate-100')}>
                    {module.difficulty_level}
                  </Badge>
                </div>
                <div className={cn("flex items-center gap-3 mt-1.5 text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                  {module.estimated_duration_minutes && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{module.estimated_duration_minutes}m
                    </span>
                  )}
                  {module.cpd_hours && (
                    <span className="flex items-center gap-0.5">
                      <Award className="w-2.5 h-2.5" />{module.cpd_hours} CPD
                    </span>
                  )}
                  {quizCount > 0 && <span>{quizCount} questions</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Module Content */}
      <div className={cn(
        "flex-1 rounded-xl border overflow-hidden flex flex-col",
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>
        {selectedModule ? (
          <>
            {/* Module Header */}
            <div className={cn(
              "p-5 border-b",
              isDark ? "border-slate-700" : "border-slate-200"
            )}>
              <h2 className="text-lg font-bold">{selectedModule.module_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={cn("text-xs", CATEGORY_COLORS[selectedModule.category] || 'bg-slate-100')}>
                  {selectedModule.category}
                </Badge>
                <Badge className={cn("text-xs", DIFFICULTY_COLORS[selectedModule.difficulty_level] || 'bg-slate-100')}>
                  {selectedModule.difficulty_level}
                </Badge>
                {selectedModule.estimated_duration_minutes && (
                  <span className={cn("text-xs flex items-center gap-1", isDark ? "text-slate-400" : "text-slate-500")}>
                    <Clock className="w-3 h-3" />{selectedModule.estimated_duration_minutes} min
                  </span>
                )}
                {selectedModule.cpd_hours && (
                  <span className={cn("text-xs flex items-center gap-1", isDark ? "text-slate-400" : "text-slate-500")}>
                    <Award className="w-3 h-3" />{selectedModule.cpd_hours} CPD hours
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {['content', 'quiz'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors",
                      activeTab === tab
                        ? "bg-teal-600 text-white"
                        : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab === 'quiz' ? 'Quiz / Assessment' : 'Module Content'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'content' && (
                <div className="space-y-5 max-w-3xl">
                  {selectedModule.learning_objectives?.length > 0 && (
                    <div className={cn("p-4 rounded-xl border", isDark ? "bg-slate-900 border-slate-700" : "bg-teal-50 border-teal-200")}>
                      <h3 className="text-sm font-semibold text-teal-700 mb-2">Learning Objectives</h3>
                      <ul className="space-y-1">
                        {selectedModule.learning_objectives.map((obj, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                            <span className={isDark ? "text-slate-300" : "text-slate-700"}>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={cn("prose prose-sm max-w-none", isDark ? "prose-invert" : "")}>
                    <ReactMarkdown>{selectedModule.content_markdown || '*No content available.*'}</ReactMarkdown>
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="max-w-2xl">
                  <div className="mb-5">
                    <h3 className="font-semibold">Module Assessment</h3>
                    <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                      Passing score: {selectedModule.passing_score || 80}%
                      {selectedModule.cpd_hours && ` · ${selectedModule.cpd_hours} CPD hours on completion`}
                    </p>
                  </div>
                  <QuizRunner module={selectedModule} key={selectedModule.id} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
            <p className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-500")}>Select a module to begin</p>
            <p className={cn("text-sm mt-1", isDark ? "text-slate-500" : "text-slate-400")}>{filtered.length} modules available</p>
          </div>
        )}
      </div>
    </div>
  );
}