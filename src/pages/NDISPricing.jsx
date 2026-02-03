import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, Calculator, FileText, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NDISPricing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hours, setHours] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  // NDIS Pricing Arrangements and Price Limits 2025-26
  const pricingData = [
    // Capacity Building - Daily Activities
    {
      id: '01_011_0107_1_1',
      category: 'Capacity Building - Daily Activities',
      name: 'Assistance with Daily Life Tasks in a Group or Shared Living Arrangement - Standard - Weekday Daytime',
      hourlyRate: 68.50,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '01_015_0107_1_1',
      category: 'Capacity Building - Daily Activities',
      name: 'Development of Daily Living and Life Skills - Standard - Weekday Daytime',
      hourlyRate: 68.50,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '01_799_0128_1_1',
      category: 'Capacity Building - Daily Activities',
      name: 'Group Based Activities - Standard - Weekday Daytime',
      hourlyRate: 33.61,
      unit: 'Hour',
      registration: 'Required'
    },

    // Capacity Building - Support Coordination
    {
      id: '07_001_0106_6_3',
      category: 'Capacity Building - Support Coordination',
      name: 'Support Coordination',
      hourlyRate: 101.81,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '07_002_0106_6_3',
      category: 'Capacity Building - Support Coordination',
      name: 'Specialist Support Coordination',
      hourlyRate: 165.59,
      unit: 'Hour',
      registration: 'Required'
    },

    // Capacity Building - Improved Relationships
    {
      id: '09_011_0136_1_1',
      category: 'Capacity Building - Improved Relationships',
      name: 'Development of Skills for Improved Relationships - Standard - Weekday Daytime',
      hourlyRate: 68.50,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '09_012_0136_1_1',
      category: 'Capacity Building - Improved Relationships',
      name: 'Therapeutic Supports - Standard - Weekday Daytime',
      hourlyRate: 221.85,
      unit: 'Hour',
      registration: 'Required'
    },

    // Capacity Building - Choice and Control
    {
      id: '11_021_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Foundational Standard - Weekday Daytime',
      hourlyRate: 193.99,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '11_022_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Level 1 Standard - Weekday Daytime',
      hourlyRate: 193.99,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '11_023_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Level 2 (Provisional) Standard - Weekday Daytime',
      hourlyRate: 214.41,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '11_024_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Level 2 Standard - Weekday Daytime',
      hourlyRate: 214.41,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '11_025_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Level 3 (Provisional) Standard - Weekday Daytime',
      hourlyRate: 240.48,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '11_026_0103_1_1',
      category: 'Capacity Building - Choice and Control',
      name: 'Behaviour Support - Level 3 Standard - Weekday Daytime',
      hourlyRate: 240.48,
      unit: 'Hour',
      registration: 'Required'
    },

    // Core - Daily Activities
    {
      id: '01_005_0107_1_1',
      category: 'Core - Daily Activities',
      name: 'Assistance with Self-Care Activities - Standard - Weekday Daytime',
      hourlyRate: 68.50,
      unit: 'Hour',
      registration: 'Required'
    },
    {
      id: '01_013_0107_1_1',
      category: 'Core - Daily Activities',
      name: 'Assistance to Access Community, Social and Recreational Activities - Standard - Weekday Daytime',
      hourlyRate: 68.50,
      unit: 'Hour',
      registration: 'Required'
    },

    // Assessment and Recommendation
    {
      id: '15_037_0120_1_1',
      category: 'Assessment and Recommendation',
      name: 'Assessment Recommendation Therapy Or Training - High Intensity - Weekday Daytime',
      hourlyRate: 221.85,
      unit: 'Hour',
      registration: 'Required'
    },
  ];

  const categories = ['all', ...new Set(pricingData.map(item => item.category))];

  const filteredItems = pricingData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const calculateTotal = (rate) => {
    return (rate * hours).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">NDIS Pricing Reference</h1>
        <p className="text-muted-foreground">NDIS Pricing Arrangements and Price Limits 2025-26</p>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          This reference includes NDIS pricing for 2025-26 financial year. Always verify current rates with official NDIS Price Guide before billing.
        </AlertDescription>
      </Alert>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Price Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or support item number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculator */}
      {selectedItem && (
        <Card className="border-teal-200 bg-teal-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-teal-900">Quick Calculator</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setSelectedItem(null)}>Clear</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-teal-900">{selectedItem.name}</p>
              <p className="text-xs text-teal-700">{selectedItem.id}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.25"
                />
              </div>
              <div>
                <Label>Total</Label>
                <div className="flex items-center h-10 px-3 bg-white rounded-md border">
                  <DollarSign className="w-4 h-4 text-teal-600 mr-1" />
                  <span className="font-bold text-teal-900">{calculateTotal(selectedItem.hourlyRate)}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-teal-700">
              ${selectedItem.hourlyRate.toFixed(2)} per hour × {hours} hours
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{filteredItems.length} Support Items</h3>
        </div>
        
        {filteredItems.map(item => (
          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItem(item)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{item.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="font-mono">{item.id}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-teal-600" />
                      <span className="font-bold text-teal-900">${item.hourlyRate.toFixed(2)}</span>
                      <span className="text-muted-foreground">/ {item.unit}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{item.registration}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}