import React from 'react';
import { ArrowLeft, Loader2, AlertCircle, MessageSquare, Send } from 'lucide-react';

function ChatArea({
  user,
  activeFriend,
  setActiveFriend,
  messages,
  messagesLoading,
  messagesError,
  isFetchingMore,
  isFriendTyping,
  inputText,
  handleInputChange,
  handleSendMessage,
  timelineContainerRef,
  handleScroll,
  messagesEndRef
}) {
  return (
    <div className={`flex-1 flex flex-col h-full bg-slate-50 ${!activeFriend ? 'hidden md:flex' : 'flex'}`}>
      {/* Active Header */}
      <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFriend(null)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img
            src={activeFriend.profileImage || '/placeholder-avatar.png'}
            alt={`${activeFriend.username} avatar`}
            className="h-10 w-10 rounded-xl object-cover border border-slate-100"
          />
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">
              {activeFriend.username}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isFriendTyping ? (
                <span className="text-cyan-600 font-semibold animate-pulse">Typing...</span>
              ) : (
                "Active Session Chat"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Timeline */}
      <div
        ref={timelineContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
      >
        {isFetchingMore && (
          <div className="flex justify-center items-center py-2 text-cyan-600 shrink-0">
            <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Loading older history...</span>
          </div>
        )}
        {messagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Loading conversation...</span>
          </div>
        ) : messagesError ? (
          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm max-w-md mx-auto mt-6">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{messagesError}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="h-12 w-12 text-slate-300 mb-2" />
            <p className="font-semibold text-sm">Say hello!</p>
            <p className="text-xs text-slate-500 mt-1">Start the conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === (user.id || user._id) || 
              (typeof msg.sender === 'object' && msg.sender?._id === (user.id || user._id));
            
            return (
              <div
                key={msg._id}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative transition-all duration-200 ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed break-words">{msg.text}</p>
                  
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? 'text-white/70' : 'text-slate-400'
                  }`}>
                    <span>
                      {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {isMe && (
                      <span className="ml-0.5 flex items-center">
                        {msg.status === 'read' ? (
                          <span className="text-cyan-300 font-bold text-xs select-none leading-none">✓✓</span>
                        ) : msg.status === 'delivered' ? (
                          <span className="text-white/60 font-bold text-xs select-none leading-none">✓✓</span>
                        ) : (
                          <span className="text-white/40 font-bold text-xs select-none leading-none">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isFriendTyping && (
          <div className="flex w-full justify-start">
            <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm text-sm flex items-center gap-1.5">
              <span className="h-2 w-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Form Chat Input */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder={`Type a message to ${activeFriend.username}...`}
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white pl-4 pr-4 py-3 rounded-xl border border-slate-200 text-sm placeholder-slate-400 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg active:scale-95 transition-all duration-150 flex items-center justify-center"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatArea;
