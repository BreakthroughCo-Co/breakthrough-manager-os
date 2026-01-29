import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Bell,
  Shield,
  LogOut,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500 mt-1">Manage your account and application preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <Separator className="my-4" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{user?.full_name || 'User'}</h3>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {user?.role === 'admin' ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={user?.full_name || ''} disabled className="bg-slate-50" />
                    <p className="text-xs text-slate-400 mt-1">Contact support to change your name</p>
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input value={user?.email || ''} disabled className="bg-slate-50" />
                    <p className="text-xs text-slate-400 mt-1">Contact support to change your email</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'organization' && (
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Business information and NDIS details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                  <h4 className="font-medium text-teal-900">Breakthrough Coaching & Consulting</h4>
                  <p className="text-sm text-teal-700 mt-1">NDIS Registered Behaviour Support Provider</p>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label>ABN</Label>
                    <Input placeholder="Enter ABN" defaultValue="" />
                  </div>
                  <div>
                    <Label>NDIS Registration Number</Label>
                    <Input placeholder="Enter registration number" defaultValue="" />
                  </div>
                  <div>
                    <Label>Business Address</Label>
                    <Input placeholder="Enter business address" defaultValue="" />
                  </div>
                  <div>
                    <Label>Primary Contact Phone</Label>
                    <Input placeholder="Enter phone number" defaultValue="" />
                  </div>
                </div>

                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what you want to be notified about</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Compliance Alerts</p>
                      <p className="text-sm text-slate-500">Get notified about upcoming compliance deadlines</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Plan Review Reminders</p>
                      <p className="text-sm text-slate-500">Alerts when client plans are approaching end dates</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Funding Utilization Warnings</p>
                      <p className="text-sm text-slate-500">Notify when client funding exceeds thresholds</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Task Reminders</p>
                      <p className="text-sm text-slate-500">Daily summary of pending tasks</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Account Secured</span>
                  </div>
                  <p className="text-sm text-emerald-600 mt-1">
                    Your account is protected with secure authentication
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Session Information</h4>
                    <div className="p-3 rounded-lg bg-slate-50 text-sm">
                      <p className="text-slate-600">Logged in as: <span className="font-medium text-slate-900">{user?.email}</span></p>
                      <p className="text-slate-500 mt-1">Role: {user?.role === 'admin' ? 'Administrator' : 'User'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Danger Zone</h4>
                    <Button variant="destructive" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out of All Sessions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}