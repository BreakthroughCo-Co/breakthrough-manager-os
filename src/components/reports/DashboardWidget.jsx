import React, { useMemo } from 'react';
import { format, subDays, subMonths, subQuarters, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Settings, Trash2, GripVertical, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#10B981'];

const getDateRange = (timeframe) => {
  const now = new Date();
  switch (timeframe) {
    case 'last_7_days':
      return { from: subDays(now, 7), to: now };
    case 'last_30_days':
      return { from: subDays(now, 30), to: now };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'this_quarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'last_quarter':
      const lastQuarter = subQuarters(now, 1);
      return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'all_time':
    default:
      return { from: null, to: null };
  }
};

const filterByDateRange = (data, dateField, timeframe) => {
  const { from, to } = getDateRange(timeframe);
  if (!from || !to) return data;
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= from && itemDate <= to;
  });
};

const aggregateData = (data, groupField, valueField, aggregation = 'count') => {
  const groups = {};
  data.forEach(item => {
    const key = item[groupField]?.toString()?.replace(/_/g, ' ') || 'Unknown';
    if (!groups[key]) groups[key] = { items: [], sum: 0 };
    groups[key].items.push(item);
    groups[key].sum += parseFloat(item[valueField]) || 0;
  });

  return Object.entries(groups).map(([name, { items, sum }]) => ({
    name,
    value: aggregation === 'count' ? items.length : aggregation === 'sum' ? sum : sum / items.length
  }));
};

export default function DashboardWidget({ 
  config, 
  data, 
  onEdit, 
  onDelete, 
  isEditing = false,
  dragHandleProps 
}) {
  const {
    title,
    entity,
    visualization,
    groupBy,
    valueField,
    aggregation = 'count',
    timeframe = 'all_time',
    dateField = 'created_date',
    showTrend = false,
    size = 'medium'
  } = config;

  const processedData = useMemo(() => {
    if (!data || !data.length) return [];
    
    // Filter by date range
    const filteredData = filterByDateRange(data, dateField, timeframe);
    
    // Aggregate data
    if (groupBy) {
      return aggregateData(filteredData, groupBy, valueField, aggregation);
    }
    
    return filteredData;
  }, [data, groupBy, valueField, aggregation, timeframe, dateField]);

  const totalValue = useMemo(() => {
    if (aggregation === 'count') return processedData.reduce((sum, d) => sum + d.value, 0);
    if (aggregation === 'sum') return processedData.reduce((sum, d) => sum + d.value, 0);
    return processedData.length;
  }, [processedData, aggregation]);

  const trend = useMemo(() => {
    if (!showTrend || !data || data.length < 2) return null;
    // Simple trend calculation - compare first half to second half
    const sorted = [...data].sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid).length;
    const secondHalf = sorted.slice(mid).length;
    const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    return { value: change, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
  }, [data, showTrend, dateField]);

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 lg:col-span-2',
    large: 'col-span-1 lg:col-span-3',
    full: 'col-span-full'
  };

  const renderVisualization = () => {
    if (!processedData.length) {
      return (
        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
          No data available
        </div>
      );
    }

    switch (visualization) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={processedData} 
                cx="50%" 
                cy="50%" 
                outerRadius="70%" 
                dataKey="value" 
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {processedData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#14B8A6" fill="#14B8A680" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'metric':
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-slate-900">
              {aggregation === 'sum' ? `$${totalValue.toLocaleString()}` : totalValue.toLocaleString()}
            </p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-slate-500'
              )}>
                {trend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                 trend.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                 <Minus className="w-4 h-4" />}
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
            )}
          </div>
        );
      
      case 'table':
        return (
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy?.replace(/_/g, ' ')}</TableHead>
                  <TableHead className="text-right">{aggregation === 'count' ? 'Count' : 'Value'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium capitalize">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {aggregation === 'sum' ? `$${row.value.toLocaleString()}` : row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      
      default:
        return null;
    }
  };

  const heightClasses = {
    metric: 'h-32',
    table: 'h-64',
    default: 'h-48'
  };

  return (
    <Card className={cn(sizeClasses[size], "relative group")}>
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7" {...dragHandleProps}>
            <GripVertical className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(config)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onDelete(config.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="outline" className="text-xs capitalize">
            {timeframe.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(heightClasses[visualization] || heightClasses.default)}>
        {renderVisualization()}
      </CardContent>
    </Card>
  );
}