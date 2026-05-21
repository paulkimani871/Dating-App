import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Phone, Video, Smile, Shield, CheckCheck, Loader2, CornerUpLeft, X } from 'lucide-react';

interface ChatMessage {
  id: string | number;
  sender_id: string | number;
  receiver_id: string | number;
  message_type: 'text' | 'image' | 'voice' | 'video';
  content: string;
  media_url: string;
  is_read: boolean;
  created_at: string;
  replyTo?: string;
}

interface ChatUser {
  id: string | number;
  name: string;
  profile?: {
    avatar_url: string;
    location_name: string;
    is_premium: boolean;
    online_status: boolean;
  };
}

interface ChatBoxProps {
  currentUserId: string | number;
  partner: ChatUser;
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'image', mediaUrl?: string, replyTo?: string) => void;
  partnerIsTyping: boolean;
}

export default function ChatBox({ currentUserId, partner, messages, onSendMessage, partnerIsTyping }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const [showImageSimulator, setShowImageSimulator] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerIsTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // Call sending routine passing reply reference if present
    onSendMessage(
      inputText, 
      'text', 
      undefined, 
      replyingToMessage ? replyingToMessage.content : undefined
    );
    
    setInputText('');
    setReplyingToMessage(null);
  };

  const handleSendImage = (url: string) => {
    onSendMessage(
      'Sent a photo 📸', 
      'image', 
      url, 
      replyingToMessage ? replyingToMessage.content : undefined
    );
    setShowImageSimulator(false);
    setReplyingToMessage(null);
  };

  const mockImageUrls = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop'
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/20 border border-slate-800 rounded-3xl overflow-hidden glass-card">
      {/* Chat header */}
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={partner.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-850"
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full ${
              partner.profile?.online_status ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-slate-650'
            }`}></span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{partner.name}</span>
              {partner.profile?.is_premium && (
                <span className="text-[8px] bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full px-1.5 py-0.5 font-bold uppercase">
                  VIP
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-400">
              {partner.profile?.online_status ? 'Online active' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Audio Video Buttons */}
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors" title="Start voice call">
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors" title="Start video call">
            <Video className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages stream area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-mesh min-h-0">
        <div className="text-center py-4">
          <span className="text-[10px] bg-slate-900/60 text-slate-500 border border-slate-850 px-3 py-1 rounded-full font-medium">
            🔒 Dream Match End-to-End Encrypted
          </span>
        </div>

        {messages.map((msg) => {
          const isSelf = msg.sender_id.toString() === currentUserId.toString();
          return (
            <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-fade-in group/item`}>
              <div className={`max-w-[70%] flex flex-col ${isSelf ? 'items-end' : 'items-start'} gap-1 relative`}>
                
                {/* Reply Quote Bubble above message bubble */}
                {msg.replyTo && (
                  <div className={`text-[10px] px-3 py-1.5 rounded-xl border border-slate-800/80 italic ${
                    isSelf 
                      ? 'bg-slate-900/60 text-slate-400 mr-2 -mb-2' 
                      : 'bg-slate-900/40 text-slate-400 ml-2 -mb-2'
                  }`}>
                    <blockquote>"{msg.replyTo.length > 40 ? msg.replyTo.slice(0, 40) + '...' : msg.replyTo}"</blockquote>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!isSelf && (
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-white opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                      title="Reply to message"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  )}

                  <div className={`p-4.5 rounded-2xl text-xs leading-relaxed ${
                    isSelf
                      ? 'bg-gradient-brand text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.message_type === 'image' ? (
                      <div className="space-y-2">
                        <img
                          src={msg.media_url}
                          alt="Shared image"
                          className="rounded-xl max-h-48 object-cover cursor-zoom-in"
                        />
                        {msg.content && <p>{msg.content}</p>}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {isSelf && (
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-white opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                      title="Reply to message"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-[9px] text-slate-500 font-medium">
                    {msg.created_at}
                  </span>
                  {isSelf && (
                    <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-indigo-400' : 'text-slate-650'}`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live typing presence indicator bubbles */}
        {partnerIsTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none">
              <span className="text-[10px] text-slate-400 font-medium italic">
                {partner.name} is typing
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Shared photo selector panel */}
      {showImageSimulator && (
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-3 animate-slide-up">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Simulate Photo Share</h4>
            <button onClick={() => setShowImageSimulator(false)} className="text-[10px] text-rose-400 font-bold underline cursor-pointer bg-transparent border-0">
              Cancel
            </button>
          </div>
          <div className="flex gap-4">
            {mockImageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => handleSendImage(url)}
                className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500 hover:scale-105 transition-all"
              >
                <img src={url} alt="Mock option" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Replying banner indicator */}
      {replyingToMessage && (
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 animate-slide-up">
          <div className="flex items-center gap-2 overflow-hidden">
            <CornerUpLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Replying to <strong className="text-white">{replyingToMessage.sender_id.toString() === currentUserId.toString() ? 'yourself' : partner.name}</strong>: "{replyingToMessage.content}"
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setReplyingToMessage(null)}
            className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer border-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Message Input Bottom Bar */}
      <form onSubmit={handleSend} className="px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-3">
        {/* Add attachments */}
        <button
          type="button"
          onClick={() => setShowImageSimulator(!showImageSimulator)}
          className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Share photo"
        >
          <Image className="w-4 h-4" />
        </button>

        {/* Text Input field */}
        <input
          type="text"
          placeholder={`Write message to ${partner.name}...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500"
        />

        {/* Send Action */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-3 rounded-xl bg-gradient-brand text-white shadow shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
