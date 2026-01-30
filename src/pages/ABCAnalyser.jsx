import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Grid3X3,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const emptyRecord = {
  client_id: '',
  client_name: '',
  observation_date: format(new Date(), 'yyyy-MM-dd'),
  observation_time: '',
  setting: '',
  antecedent: '',
  behaviour: '',
  behaviour_intensity: 'moderate',
  behaviour_duration: 0,
  consequence: '',
  hypothesised_function: 'unknown',
  notes: ''
};

const intensityColors = {
  low: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  severe: 'bg-red-100 text-red-700',
};

const functionColors = {
  escape_avoidance: '#3B82F6',
  attention: '#8B5CF6',
  tangible: '#F59E0B',
  sensory: '#10B981',
  unknown: '#6B7280',
};

const timeSlots = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ABCAnalyser() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);
  const [selectedClient, setSelectedClient] = useState('all');
  const [activeTab, setActiveTab] = useState('data');

  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['abcRecords'],
    queryFn: () => base44.entities.ABCRecord.list('-observation_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ABCRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abcRecords'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ABCRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abcRecords'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ABCRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['abcRecords'] }),
  });

  const filteredRecords = selectedClient === 'all' ? records : records.filter(r => r.client_id === selectedClient);

  // Calculate analytics
  const functionData = useMemo(() => {
    const counts = { escape_avoidance: 0, attention: 0, tangible: 0, sensory: 0, unknown: 0 };
    filteredRecords.forEach(r => { if (r.hypothesised_function) counts[r.hypothesised_function]++; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, fill: functionColors[name] }));
  }, [filteredRecords]);

  // Scatterplot data - time of day vs day of week heatmap
  const scatterplotData = useMemo(() => {
    const grid = {};
    daysOfWeek.forEach(day => { grid[day] = {}; timeSlots.forEach(time => { grid[day][time] = 0; }); });
    
    filteredRecords.forEach(r => {
      if (r.observation_date && r.observation_time) {
        const date = parseISO(r.observation_date);
        const dayIdx = date.getDay();
        const dayName = daysOfWeek[dayIdx === 0 ? 6 : dayIdx - 1];
        const hour = parseInt(r.observation_time.split(':')[0]);
        const slot = timeSlots.find((s, i) => hour >= parseInt(s.split(':')[0]) && (i === timeSlots.length - 1 || hour < parseInt(timeSlots[i + 1].split(':')[0])));
        if (slot && grid[dayName]) grid[dayName][slot]++;
      }
    });
    return grid;
  }, [filteredRecords]);

  const handleOpenDialog = (record = null) => {
    if (record) { setEditingRecord(record); setFormData(record); }
    else { setEditingRecord(null); setFormData(emptyRecord); }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingRecord(null); setFormData(emptyRecord); };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ ...formData, client_id: clientId, client_name: client?.full_name || '' });
  };

  const handleSubmit = () => {
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: formData });
    else createMutation.mutate(formData);
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-slate-100';
    if (count <= 2) return 'bg-amber-200';
    if (count <= 5) return 'bg-orange-300';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            ABC Data & Scatterplot Analyser
          </h2>
          <p className="text-slate-500 mt-1">Record and visualise behaviour data</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Log Behaviour
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="data"><Grid3X3 className="w-4 h-4 mr-2" />Data Grid</TabsTrigger>
          <TabsTrigger value="analysis"><BarChart3 className="w-4 h-4 mr-2" />Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Setting</TableHead>
                    <TableHead>Antecedent</TableHead>
                    <TableHead>Behaviour</TableHead>
                    <TableHead>Consequence</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{record.observation_date ? format(new Date(record.observation_date), 'MMM d') : '-'}</p>
                          <p className="text-slate-500">{record.observation_time || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{record.client_name || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[100px] truncate">{record.setting || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{record.antecedent || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm max-w-[120px] truncate">{record.behaviour}</p>
                          <Badge className={cn("mt-1", intensityColors[record.behaviour_intensity])}>{record.behaviour_intensity}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{record.consequence || '-'}</TableCell>
                      <TableCell className="capitalize text-sm">{record.hypothesised_function?.replace(/_/g, ' ') || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(record)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(record.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No ABC data recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Function Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Function Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={functionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {functionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Scatterplot Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time Scatterplot (Heatmap)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-xs text-slate-500 p-1"></th>
                        {timeSlots.map(time => <th key={time} className="text-xs text-slate-500 p-1">{time}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map(day => (
                        <tr key={day}>
                          <td className="text-xs text-slate-500 p-1 font-medium">{day}</td>
                          {timeSlots.map(time => (
                            <td key={`${day}-${time}`} className="p-1">
                              <div className={cn("w-8 h-8 rounded flex items-center justify-center text-xs font-medium", getHeatmapColor(scatterplotData[day]?.[time] || 0))}>
                                {scatterplotData[day]?.[time] || ''}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-4 h-4 bg-slate-100 rounded" />0</span>
                  <span className="flex items-center gap-1"><div className="w-4 h-4 bg-amber-200 rounded" />1-2</span>
                  <span className="flex items-center gap-1"><div className="w-4 h-4 bg-orange-300 rounded" />3-5</span>
                  <span className="flex items-center gap-1"><div className="w-4 h-4 bg-red-400 rounded" />5+</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingRecord ? 'Edit ABC Record' : 'Log Behaviour Observation'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={formData.observation_date} onChange={(e) => setFormData({ ...formData, observation_date: e.target.value })} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={formData.observation_time} onChange={(e) => setFormData({ ...formData, observation_time: e.target.value })} />
            </div>
            <div>
              <Label>Setting/Location</Label>
              <Input value={formData.setting} onChange={(e) => setFormData({ ...formData, setting: e.target.value })} placeholder="Where did it occur?" />
            </div>
            <div className="col-span-2">
              <Label>Antecedent (What happened before?)</Label>
              <Textarea value={formData.antecedent} onChange={(e) => setFormData({ ...formData, antecedent: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Behaviour *</Label>
              <Textarea value={formData.behaviour} onChange={(e) => setFormData({ ...formData, behaviour: e.target.value })} placeholder="Describe the behaviour objectively" rows={2} />
            </div>
            <div>
              <Label>Intensity</Label>
              <Select value={formData.behaviour_intensity} onValueChange={(v) => setFormData({ ...formData, behaviour_intensity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={formData.behaviour_duration} onChange={(e) => setFormData({ ...formData, behaviour_duration: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="col-span-2">
              <Label>Consequence (What happened after?)</Label>
              <Textarea value={formData.consequence} onChange={(e) => setFormData({ ...formData, consequence: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Hypothesised Function</Label>
              <Select value={formData.hypothesised_function} onValueChange={(v) => setFormData({ ...formData, hypothesised_function: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="escape_avoidance">Escape/Avoidance</SelectItem>
                  <SelectItem value="attention">Attention</SelectItem>
                  <SelectItem value="tangible">Tangible</SelectItem>
                  <SelectItem value="sensory">Sensory</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.client_id || !formData.behaviour} className="bg-teal-600 hover:bg-teal-700">
              {editingRecord ? 'Update' : 'Save'} Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}