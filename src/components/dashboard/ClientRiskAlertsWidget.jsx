import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientRiskAlertsWidget() {
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: riskProfiles = [], isLoading: risksLoading } = useQuery({
    queryKey: ['clientRiskProfiles'],
    queryFn: () => base44.entities.ClientRiskProfile.list('-analysis_date')
  });

  const isLoading = clientsLoading || risksLoading;

  // Get latest risk profile for each client
  const clientsWithRisk = clients
    .map(client => {
      const latestRisk = riskProfiles.find(r => r.client_id === client.id);
      return { ...client, riskProfile: latestRisk };
    })
    .filter(c => {
      const risk = c.riskProfile;
      if (!risk) return false;
      
      // Include if high/critical risk OR declining trend
      const isCriticalRisk = ['high', 'critical'].includes(risk.overall_risk_level);
      const isDeclining = risk.trend_direction === 'declining';
      
      return isCriticalRisk || isDeclining;
    })
    .sort((a, b) => {
      // Sort by risk score descending
      const scoreA = a.riskProfile?.overall_risk_score || 0;
      const scoreB = b.riskProfile?.overall_risk_score || 0;
      return scoreB - scoreA;
    });

  const criticalRiskClients = clientsWithRisk.filter(c => 
    c.riskProfile?.overall_risk_level === 'critical'
  ).length;
  
  const highRiskClients = clientsWithRisk.filter(c => 
    c.riskProfile?.overall_risk_level === 'high'
  ).length;
  
  const decliningClients = clientsWithRisk.filter(c => 
    c.riskProfile?.trend_direction === 'declining'
  ).length;

  const getRiskColor = (level) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-amber-100 text-amber-800 border-amber-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[level] || colors.medium;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Client Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Client Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          {criticalRiskClients > 0 && (
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalRiskClients} Critical
            </Badge>
          )}
          {highRiskClients > 0 && (
            <Badge className="bg-orange-100 text-orange-800">
              {highRiskClients} High Risk
            </Badge>
          )}
          {decliningClients > 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              <TrendingDown className="h-3 w-3 mr-1" />
              {decliningClients} Declining
            </Badge>
          )}
          {clientsWithRisk.length === 0 && (
            <p className="text-sm text-slate-500">No high-risk clients at this time</p>
          )}
        </div>

        {/* Risk Alerts List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {clientsWithRisk.slice(0, 10).map(client => {
            const risk = client.riskProfile;
            const riskColor = getRiskColor(risk.overall_risk_level);
            
            return (
              <div
                key={client.id}
                className={`p-3 rounded-lg border ${riskColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{client.full_name}</p>
                      {risk.trend_direction === 'declining' && (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs h-5">
                        Risk: {risk.overall_risk_score}/100
                      </Badge>
                      <Badge variant="outline" className="text-xs h-5">
                        {risk.overall_risk_level.toUpperCase()}
                      </Badge>
                    </div>

                    {risk.trend_direction && (
                      <p className="text-xs mt-1 opacity-75">
                        Trend: {risk.trend_direction}
                      </p>
                    )}

                    {/* Top risk indicators */}
                    {risk.disengagement_indicators && risk.disengagement_indicators.length > 0 && (
                      <p className="text-xs mt-1 opacity-75">
                        • {risk.disengagement_indicators[0]}
                      </p>
                    )}
                  </div>
                  
                  <Link to={`${createPageUrl('ClientDetail')}?clientId=${client.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {clientsWithRisk.length > 10 && (
          <p className="text-xs text-slate-500 text-center pt-2">
            +{clientsWithRisk.length - 10} more clients require attention
          </p>
        )}
      </CardContent>
    </Card>
  );
}