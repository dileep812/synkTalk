import React from 'react';
import { MessageSquare } from 'lucide-react';

function ChatFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
      <div className="h-16 w-16 rounded-2xl bg-cyan-100/80 text-cyan-600 flex items-center justify-center mb-4 shadow-inner">
        <MessageSquare className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
        Your Workspace Inbox
      </h2>
      <p className="text-slate-500 text-sm mt-1 max-w-sm">
        Select a secure, authorized connection from the friends panel to begin messaging.
      </p>
    </div>
  );
}

export default ChatFallback;
