import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X, GripVertical, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#10B981'];

export default function DashboardWidget({ widget, data, onRemove, isEditing }) {
  const { type, config, title } = widget;

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const { entity, groupBy, aggregation, valueField } = config;
    
    if (type === 'metric') {
      return data;
    }

    if (type === 'table') {
      return data.slice(0, config.limit || 10);
    }

    // Group data for charts
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy]?.toString()?.replace(/_/g, ' ') || 'Unknown';
      if (!grouped[key]) {
        grouped[key] = { count: 0, sum: 0, items: [] };
      }
      grouped[key].count++;
      grouped[key].sum += parseFloat(item[valueField]) || 0;
      grouped[key].items.push(item);
    });

    return Object.entries(grouped).map(([name, values]) => ({
      name,
      value: aggregation === 'sum' ? values.sum : aggregation === 'avg' ? values.sum / values.count : values.count
    }));
  }, [data, type, config]);

  const metricValue = useMemo(() => {
    if (type !== 'metric' || !data) return { value: 0, trend: 0 };
    
    const { aggregation, valueField } = config;
    
    if (aggregation === 'count') {
      return { value: data.length, trend: 0 };
    }
    
    if (aggregation === 'sum') {
      const sum = data.reduce((acc, item) => acc + (parseFloat(item[valueField]) || 0), 0);
      return { value: sum, trend: 0 };
    }
    
    if (aggregation === 'avg') {
      const sum = data.reduce((acc, item) => acc + (parseFloat(item[valueField]) || 0), 0);
      return { value: data.length > 0 ? sum / data.length : 0, trend: 0 };
    }
    
    return { value: 0, trend: 0 };
  }, [data, type, config]);

  const formatMetricValue = (value) => {
    if (config.format === 'currency') {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    if (config.format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    if (config.format === 'hours') {
      return `${value.toFixed(1)}h`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6' }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'metric':
        return (
          <div className="flex flex-col items-center justify-center h-32">
            <p className={cn("text-4xl font-bold", config.color || "text-teal-600")}>
              {formatMetricValue(metricValue.value)}
            </p>
            {config.subtitle && <p className="text-sm text-slate-500 mt-1">{config.subtitle}</p>}
          </div>
        );
      
      case 'table':
        const fields = config.fields || [];
        return (
          <div className="overflow-x-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  {fields.map(f => <TableHead key={f.key} className="text-xs">{f.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row, idx) => (
                  <TableRow key={idx}>
                    {fields.map(f => (
                      <TableCell key={f.key} className="text-xs py-2">
                        {f.format === 'date' && row[f.key] 
                          ? format(new Date(row[f.key]), 'MMM d') 
                          : f.format === 'currency' 
                            ? `$${parseFloat(row[f.key] || 0).toLocaleString()}`
                            : row[f.key] || '-'
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      
      default:
        return <div className="h-48 flex items-center justify-center text-slate-400">Unknown widget type</div>;
    }
  };

  return (
    <Card className={cn("relative group", isEditing && "ring-2 ring-teal-200")}>
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {title}
          {config.entity && (
            <Badge variant="outline" className="text-xs font-normal">{config.entity}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}