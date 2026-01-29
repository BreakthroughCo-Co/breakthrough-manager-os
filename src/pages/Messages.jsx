import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  MessageSquare,
  Send,
  Inbox,
  Mail,
  MailOpen,
  Trash2,
  Reply,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MessageComposer from '@/components/communication/MessageComposer';

const priorityColors = {
  normal: '',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

export default function Messages() {
  const [view, setView] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date'),
  });

  const { data: practitioners = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: () => base44.entities.Practitioner.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Message.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedMessage(null);
    },
  });

  const inboxMessages = messages.filter(m => 
    m.recipient_id === currentUser?.id || m.recipient_name === currentUser?.full_name
  );
  const sentMessages = messages.filter(m => 
    m.sender_id === currentUser?.id || m.sender_name === currentUser?.full_name
  );

  const displayMessages = view === 'inbox' ? inboxMessages : sentMessages;
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.is_read && view === 'inbox') {
      updateMutation.mutate({ id: message.id, data: { ...message, is_read: true } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          <p className="text-slate-500 mt-1">Internal team communication</p>
        </div>
        <Button onClick={() => setIsComposerOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-2">
            <button
              onClick={() => setView('inbox')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                view === 'inbox' ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50"
              )}
            >
              <Inbox className="w-5 h-5" />
              <span className="font-medium">Inbox</span>
              {unreadCount > 0 && (
                <Badge className="ml-auto bg-teal-600">{unreadCount}</Badge>
              )}
            </button>
            <button
              onClick={() => setView('sent')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                view === 'sent' ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50"
              )}
            >
              <Send className="w-5 h-5" />
              <span className="font-medium">Sent</span>
            </button>
          </div>

          {/* Message List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {displayMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No messages</p>
                </div>
              ) : (
                displayMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4",
                      priorityColors[message.priority],
                      selectedMessage?.id === message.id && "bg-slate-50",
                      !message.is_read && view === 'inbox' && "bg-teal-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm truncate",
                          !message.is_read && view === 'inbox' ? "text-slate-900" : "text-slate-700"
                        )}>
                          {view === 'inbox' ? message.sender_name : message.recipient_name}
                        </p>
                        <p className="text-sm text-slate-900 truncate">{message.subject || '(No subject)'}</p>
                        <p className="text-xs text-slate-500 truncate mt-1">{message.content}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-400">
                          {format(new Date(message.created_date), 'MMM d')}
                        </span>
                        {!message.is_read && view === 'inbox' && (
                          <div className="w-2 h-2 rounded-full bg-teal-500" />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-white rounded-xl border border-slate-200 h-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">
                      {selectedMessage.subject || '(No subject)'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      From: <span className="font-medium">{selectedMessage.sender_name}</span>
                      {' → '}
                      To: <span className="font-medium">{selectedMessage.recipient_name}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(selectedMessage.created_date), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMessage.priority !== 'normal' && (
                      <Badge className={selectedMessage.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {selectedMessage.priority}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(selectedMessage.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <MailOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a message to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Composer */}
      <MessageComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        practitioners={practitioners}
        currentUser={currentUser}
      />
    </div>
  );
}