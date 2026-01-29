import React, { useState } from 'react';
import {
  Calculator,
  DollarSign,
  Clock,
  Users,
  Info,
  RefreshCw,
  Download,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// NDIS Price Guide 2024-25 (simplified rates)
const NDIS_RATES = {
  behaviour_support: {
    name: 'Behaviour Support',
    items: {
      '15_038_0117_1_3': { name: 'Assessment & Report (Level 3)', weekday: 214.41, saturday: 300.17, sunday: 385.94 },
      '15_040_0117_1_3': { name: 'Behaviour Plan Development (Level 3)', weekday: 214.41, saturday: 300.17, sunday: 385.94 },
      '15_042_0117_1_3': { name: 'Behaviour Plan Review (Level 3)', weekday: 214.41, saturday: 300.17, sunday: 385.94 },
      '15_044_0117_1_3': { name: 'Implementation Support (Level 3)', weekday: 214.41, saturday: 300.17, sunday: 385.94 },
    }
  },
  capacity_building: {
    name: 'Capacity Building',
    items: {
      '15_037_0117_1_3': { name: 'Therapeutic Supports (Level 3)', weekday: 214.41, saturday: 300.17, sunday: 385.94 },
      '15_037_0117_1_2': { name: 'Therapeutic Supports (Level 2)', weekday: 193.99, saturday: 271.59, sunday: 349.18 },
    }
  },
  group_programs: {
    name: 'Group Programs',
    items: {
      '15_046_0117_1_3': { name: 'Group Therapy (1:2)', weekday: 107.21, saturday: 150.09, sunday: 192.97 },
      '15_047_0117_1_3': { name: 'Group Therapy (1:3)', weekday: 71.47, saturday: 100.06, sunday: 128.65 },
      '15_048_0117_1_3': { name: 'Group Therapy (1:4)', weekday: 53.60, saturday: 75.04, sunday: 96.49 },
    }
  },
  travel: {
    name: 'Travel',
    items: {
      '15_038_0117_8_3': { name: 'Provider Travel (Level 3)', weekday: 107.21, saturday: 107.21, sunday: 107.21 },
    }
  }
};

export default function NDISCalculator() {
  const [category, setCategory] = useState('behaviour_support');
  const [lineItem, setLineItem] = useState('');
  const [dayType, setDayType] = useState('weekday');
  const [hours, setHours] = useState(1);
  const [participants, setParticipants] = useState(1);
  const [sessions, setSessions] = useState(1);
  const [calculations, setCalculations] = useState([]);
  const [isRatesOpen, setIsRatesOpen] = useState(false);

  const categoryItems = NDIS_RATES[category]?.items || {};

  const calculateRate = () => {
    if (!lineItem) return null;
    const item = categoryItems[lineItem];
    if (!item) return null;
    
    const rate = item[dayType];
    const totalPerSession = rate * hours;
    const totalAllSessions = totalPerSession * sessions;
    const perParticipant = totalAllSessions / participants;
    
    return {
      item,
      lineItem,
      rate,
      hours,
      dayType,
      sessions,
      participants,
      totalPerSession,
      totalAllSessions,
      perParticipant
    };
  };

  const handleAddCalculation = () => {
    const calc = calculateRate();
    if (calc) {
      setCalculations([...calculations, { ...calc, id: Date.now() }]);
    }
  };

  const handleRemoveCalculation = (id) => {
    setCalculations(calculations.filter(c => c.id !== id));
  };

  const handleReset = () => {
    setLineItem('');
    setHours(1);
    setParticipants(1);
    setSessions(1);
  };

  const totalAmount = calculations.reduce((sum, c) => sum + c.totalAllSessions, 0);

  const currentCalc = calculateRate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">NDIS Calculator</h2>
        <p className="text-slate-500 mt-1">Calculate service costs using NDIS Price Guide rates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-teal-600" />
                Service Calculator
              </CardTitle>
              <CardDescription>
                Select a support category and line item to calculate costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Support Category</Label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setLineItem(''); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NDIS_RATES).map(([key, cat]) => (
                        <SelectItem key={key} value={key}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Line Item</Label>
                  <Select value={lineItem} onValueChange={setLineItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select line item" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryItems).map(([code, item]) => (
                        <SelectItem key={code} value={code}>
                          <span className="font-mono text-xs">{code}</span>
                          <span className="ml-2">{item.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Day Type</Label>
                  <Select value={dayType} onValueChange={setDayType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekday">Weekday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday / Public Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hours per Session</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={hours}
                    onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Number of Sessions</Label>
                  <Input
                    type="number"
                    min="1"
                    value={sessions}
                    onChange={(e) => setSessions(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Number of Participants</Label>
                  <Input
                    type="number"
                    min="1"
                    value={participants}
                    onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Current Calculation Preview */}
              {currentCalc && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-teal-900">{currentCalc.item.name}</h4>
                    <Badge variant="outline" className="font-mono text-xs">{currentCalc.lineItem}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-teal-600">Hourly Rate</p>
                      <p className="font-semibold text-teal-900">${currentCalc.rate.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-teal-600">Per Session</p>
                      <p className="font-semibold text-teal-900">${currentCalc.totalPerSession.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-teal-600">Total ({sessions} session{sessions > 1 ? 's' : ''})</p>
                      <p className="font-semibold text-teal-900">${currentCalc.totalAllSessions.toFixed(2)}</p>
                    </div>
                    {participants > 1 && (
                      <div>
                        <p className="text-teal-600">Per Participant</p>
                        <p className="font-semibold text-teal-900">${currentCalc.perParticipant.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleAddCalculation} disabled={!lineItem} className="bg-teal-600 hover:bg-teal-700">
                  Add to Quote
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rate Reference */}
          <Collapsible open={isRatesOpen} onOpenChange={setIsRatesOpen} className="mt-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-400" />
                      NDIS Price Guide Reference
                    </CardTitle>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isRatesOpen && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {Object.entries(NDIS_RATES).map(([catKey, cat]) => (
                      <div key={catKey}>
                        <h4 className="font-medium text-slate-900 mb-2">{cat.name}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-2">Line Item</th>
                                <th className="text-left py-2 px-2">Description</th>
                                <th className="text-right py-2 px-2">Weekday</th>
                                <th className="text-right py-2 px-2">Saturday</th>
                                <th className="text-right py-2 px-2">Sunday</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(cat.items).map(([code, item]) => (
                                <tr key={code} className="border-b border-slate-100">
                                  <td className="py-2 px-2 font-mono text-xs">{code}</td>
                                  <td className="py-2 px-2">{item.name}</td>
                                  <td className="py-2 px-2 text-right">${item.weekday.toFixed(2)}</td>
                                  <td className="py-2 px-2 text-right">${item.saturday.toFixed(2)}</td>
                                  <td className="py-2 px-2 text-right">${item.sunday.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 mt-4">
                      * Rates based on NDIS Price Guide 2024-25. Always verify current rates with the official NDIS Price Guide.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Quote Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calculations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add items to build your quote</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calculations.map((calc, index) => (
                    <div key={calc.id} className="p-3 rounded-lg bg-slate-50 relative group">
                      <button
                        onClick={() => handleRemoveCalculation(calc.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-slate-700">{calc.item.name}</span>
                        <span className="font-semibold">${calc.totalAllSessions.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {calc.hours}h × {calc.sessions} session{calc.sessions > 1 ? 's' : ''} @ ${calc.rate.toFixed(2)}/hr ({calc.dayType})
                      </p>
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">Total Quote</span>
                      <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => setCalculations([])}>
                    Clear All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}