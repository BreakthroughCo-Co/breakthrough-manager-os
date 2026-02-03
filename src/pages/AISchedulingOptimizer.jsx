import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Loader2, TrendingUp, Users, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AISchedulingOptimizer() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [criteria, setCriteria] = useState('balanced');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  const { data: practitioners } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
    initialData: [],
  });

  const handleOptimize = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setIsOptimizing(true);
    try {
      const result = await base44.functions.invoke('optimizeStaffScheduling', {
        start_date: startDate,
        end_date: endDate,
        optimization_criteria: criteria,
        consider_travel: true,
      });
      setOptimizationResult(result.data);
    } catch (error) {
      alert('Failed to optimize schedule: ' + error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            AI Scheduling Optimizer
          </h1>
          <p className="text-slate-600 mt-2">
            Intelligent scheduling optimization considering client needs, staff capacity, and travel efficiency
          </p>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Parameters</CardTitle>
            <CardDescription>Configure the scheduling period and optimization criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Optimization Criteria</Label>
              <Select value={criteria} onValueChange={setCriteria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced (Client Needs + Staff Utilization)</SelectItem>
                  <SelectItem value="client_needs">Prioritize Client Needs</SelectItem>
                  <SelectItem value="staff_availability">Prioritize Staff Utilization</SelectItem>
                  <SelectItem value="minimize_travel">Minimize Travel Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing || !startDate || !endDate}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Optimize Schedule
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Practitioners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{practitioners.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Optimization Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {startDate && endDate ? '✓' : '○'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optimization Results */}
        {optimizationResult && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Optimization complete! Generated {optimizationResult.scheduling_recommendations?.length} scheduling recommendations across {optimizationResult.summary?.practitioners_involved} practitioners.
              </AlertDescription>
            </Alert>

            {/* Warnings */}
            {optimizationResult.warnings && optimizationResult.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="font-semibold mb-2">Scheduling Considerations:</div>
                  <ul className="space-y-1 text-sm">
                    {optimizationResult.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Optimization Notes */}
            {optimizationResult.optimization_notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700">{optimizationResult.optimization_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Recommendations</CardTitle>
                <CardDescription>
                  {optimizationResult.scheduling_recommendations?.length} appointments suggested
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimizationResult.scheduling_recommendations?.slice(0, 20).map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">{rec.client_name}</span>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {rec.practitioner_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {rec.recommended_date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {rec.recommended_time} ({rec.duration_minutes}min)
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{rec.rationale}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Schedule
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}