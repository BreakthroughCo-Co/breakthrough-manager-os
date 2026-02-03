import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, MessageSquare, Send, Mail } from 'lucide-react';

export default function CommunicationHub() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: receivedMessages = [] } = useQuery({
    queryKey: ['messages', 'received', user?.email],
    queryFn: () => base44.entities.SecureMessage.filter({ to_user_email: user?.email }),
    enabled: !!user,
  });

  const { data: sentMessages = [] } = useQuery({
    queryKey: ['messages', 'sent', user?.email],
    queryFn: () => base44.entities.SecureMessage.filter({ from_user_email: user?.email }),
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  const unreadMessages = receivedMessages.filter(m => !m.read).length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const markNotificationRead = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, {
      read: true,
      read_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markMessageRead = useMutation({
    mutationFn: (messageId) => base44.entities.SecureMessage.update(messageId, {
      read: true,
      read_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries(['messages']),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communication Hub</h1>
        <p className="text-muted-foreground">Secure messaging and notifications</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadNotifications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{receivedMessages.length + sentMessages.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            <MessageSquare className="w-4 h-4 mr-2" />
            Inbox ({unreadMessages})
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications ({unreadNotifications})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          {receivedMessages.map(msg => (
            <Card key={msg.id} className={!msg.read ? 'border-l-4 border-l-blue-500' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{msg.subject || 'No Subject'}</CardTitle>
                    <p className="text-sm text-muted-foreground">From: {msg.from_user_name}</p>
                  </div>
                  <div className="flex gap-2">
                    {!msg.read && <Badge>Unread</Badge>}
                    <Badge variant="outline">{msg.priority}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{msg.message_body}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(msg.created_date).toLocaleString()}</p>
                {!msg.read && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => markMessageRead.mutate(msg.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {sentMessages.map(msg => (
            <Card key={msg.id}>
              <CardHeader>
                <CardTitle className="text-base">{msg.subject || 'No Subject'}</CardTitle>
                <p className="text-sm text-muted-foreground">To: {msg.to_user_name}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{msg.message_body}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(msg.created_date).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="compose">
          <ComposeMessage userEmail={user?.email} userName={user?.full_name} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3">
          {notifications.map(notif => (
            <Card key={notif.id} className={!notif.read ? 'border-l-4 border-l-orange-500' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{notif.title}</CardTitle>
                    <Badge className="mt-1">{notif.notification_type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <Badge variant={notif.priority === 'critical' ? 'destructive' : 'outline'}>
                    {notif.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(notif.created_date).toLocaleString()}</p>
                {!notif.read && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => markNotificationRead.mutate(notif.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComposeMessage({ userEmail, userName }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.SecureMessage.create({
        from_user_email: userEmail,
        from_user_name: userName,
        to_user_email: to,
        to_user_name: to,
        subject,
        message_body: message,
        priority,
        thread_id: `thread_${Date.now()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setTo('');
      setSubject('');
      setMessage('');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">To</label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@email.com" />
        </div>
        <div>
          <label className="text-sm font-medium">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
        </div>
        <Button onClick={() => sendMutation.mutate()} disabled={!to || !message}>
          <Send className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </CardContent>
    </Card>
  );
}