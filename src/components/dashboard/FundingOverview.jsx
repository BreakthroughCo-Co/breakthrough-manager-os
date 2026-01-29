import React from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function FundingOverview({ clients = [], className }) {
  // Calculate funding metrics
  const totalAllocated = clients.reduce((sum, c) => sum + (c.funding_allocated || 0), 0);
  const totalUtilised = clients.reduce((sum, c) => sum + (c.funding_utilised || 0), 0);
  const remaining = totalAllocated - totalUtilised;
  const utilisationRate = totalAllocated > 0 ? (totalUtilised / totalAllocated) * 100 : 0;

  const pieData = [
    { name: 'Utilised', value: totalUtilised, color: '#14b8a6' },
    { name: 'Remaining', value: remaining, color: '#e2e8f0' },
  ];

  // Clients with low funding
  const lowFundingClients = clients.filter(c => {
    const utilRate = c.funding_allocated > 0 
      ? (c.funding_utilised / c.funding_allocated) * 100 
      : 0;
    return utilRate > 80;
  });

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-6", className)}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Funding Overview</h3>
      
      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div className="w-32 h-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `$${value.toLocaleString()}`}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-slate-900">{utilisationRate.toFixed(0)}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Allocated</p>
            <p className="text-xl font-bold text-slate-900">${totalAllocated.toLocaleString()}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-slate-500">Utilised</p>
              <p className="text-sm font-semibold text-teal-600">${totalUtilised.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Remaining</p>
              <p className="text-sm font-semibold text-slate-600">${remaining.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Funding Alert */}
      {lowFundingClients.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {lowFundingClients.length} client{lowFundingClients.length > 1 ? 's' : ''} with &gt;80% funding utilised
            </span>
          </div>
        </div>
      )}
    </div>
  );
}