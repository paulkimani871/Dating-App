import React, { useState, useEffect } from 'react';
import {
  Sliders, Shield, User, Sparkles, Star, Ban, CheckCircle,
  XCircle, FileSpreadsheet, ShieldAlert, Key, Globe, Mail,
  Landmark, Trash2, Calendar, MessageSquare, Search, Filter
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  collection, query, onSnapshot, orderBy, doc,
  deleteDoc, updateDoc, writeBatch, collectionGroup, addDoc, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

interface AdminDashboardProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mockProfiles?: any[];
  setMockProfiles?: React.Dispatch<React.SetStateAction<any[]>>;
  mockMessages?: any[];
  onlineStatus?: boolean;
}

export default function AdminDashboard({
  user,
  activeTab,
  setActiveTab,
  mockProfiles = [],
  setMockProfiles = () => { },
  mockMessages = [],
  onlineStatus = true
}: AdminDashboardProps) {

  // Real-time Firestore States
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbMessages, setDbMessages] = useState<any[]>([]);

  // User Modal details state
  const [selectedUserForModal, setSelectedUserForModal] = useState<any | null>(null);

  // Search & Filters State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [messageFilterStatus, setMessageFilterStatus] = useState<'all' | 'read' | 'unread'>('all');

  // Support Reports state
  const [reports, setReports] = useState([
    { id: 101, reporter: 'Jane Doe', reported: 'Emily Davis', reason: 'Spam Messages', desc: 'Sent promotional links for a crypto scheme multiple times.', status: 'pending', date: '2026-05-18' },
    { id: 102, reporter: 'Mark Smith', reported: 'Marcus Vance', reason: 'Fake Profile Photo', desc: 'Using celebrity stock photos and pretending to be someone else.', status: 'pending', date: '2026-05-17' }
  ]);

  // Admin Live Chat Console States
  const [dbChats, setDbChats] = useState<any[]>([]);
  const [adminActiveChatId, setAdminActiveChatId] = useState<string | null>(null);
  const [adminActivePartnerId, setAdminActivePartnerId] = useState<string | null>(null);
  const [adminActivePartnerName, setAdminActivePartnerName] = useState<string>('Select conversation');
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminReplyInput, setAdminReplyInput] = useState<string>('');

  // Configurations settings state
  const [stripeKey, setStripeKey] = useState('pk_test_dreammatch_51O4...');
  const [mailServer, setMailServer] = useState('mailpit.dreammatch.internal');
  const [securitySecret, setSecuritySecret] = useState('super_secret_jwt_dreammatch_api_token...');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Listen to Firestore Users, Chats & global Messages in real-time
  useEffect(() => {
    // 1. Users real-time listener
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setDbUsers(usersList);
    }, (err) => {
      console.error("Firestore users listener error: ", err);
    });

    // 2. Chats real-time listener (ordered by updatedAt desc)
    const qChats = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const chatsList: any[] = [];
      snapshot.forEach((doc) => {
        chatsList.push({ id: doc.id, ...doc.data() });
      });
      setDbChats(chatsList);
    }, (err) => {
      console.error("Firestore chats listener error: ", err);
    });

    // 3. Collection Group Messages real-time listener (picks up all messages across all subcollections)
    const qMessages = query(collectionGroup(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const messagesList: any[] = [];
      snapshot.forEach((doc) => {
        const chatDocRef = doc.ref.parent.parent;
        const chatId = chatDocRef ? chatDocRef.id : 'unknown';
        messagesList.push({
          id: doc.id,
          chatId,
          refPath: doc.ref.path,
          ...doc.data()
        });
      });
      setDbMessages(messagesList);
    }, (err) => {
      console.error("Firestore collection group messages listener error: ", err);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChats();
      unsubscribeMessages();
    };
  }, []);

  // Listen to active admin chat room messages in real-time
  useEffect(() => {
    if (!adminActiveChatId) {
      setAdminChatMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', adminActiveChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setAdminChatMessages(msgs);
    }, (err) => {
      console.error("Error listening to admin active chat messages:", err);
    });

    return unsubscribe;
  }, [adminActiveChatId]);

  // Compute merged datasets: combine Firebase real-time collection + preloaded mock profiles for rich visuals
  const finalUsers = dbUsers.length > 0
    ? dbUsers
    : mockProfiles.map(p => ({
      id: p.id.toString(),
      uid: p.id.toString(),
      fullName: p.name,
      email: `${p.name.toLowerCase().replace(' ', '')}@example.com`,
      profileImage: p.avatar_url,
      createdAt: new Date(Date.now() - 86400000 * p.id).toISOString(),
      lastLogin: new Date().toISOString(),
      role: 'user',
      gender: p.gender,
      age: p.age,
      relationship_goal: p.relationship_goal,
      location_name: p.location_name,
      is_premium: p.is_premium,
      verification_badge: p.verification_badge,
      status: p.status
    }));

  const finalMessages = dbMessages.length > 0
    ? dbMessages
    : mockMessages.map((m, idx) => ({
      id: m.id.toString(),
      messageId: m.id.toString(),
      senderId: m.sender_id.toString(),
      senderName: m.sender_id === 11 ? 'Emily Davis' : 'Alex Johnson',
      messageText: m.content,
      createdAt: new Date(Date.now() - 3600000 * idx).toISOString(),
      readStatus: m.is_read ? 'read' : 'unread',
      chatId: 'mock_chat_thread'
    }));

  // Resolve Member display names dynamically from UIDs
  const getMemberName = (uid: string) => {
    const found = finalUsers.find(u => u.id === uid || u.uid === uid);
    return found ? (found.fullName || found.name) : `User (${uid.slice(0, 6)})`;
  };

  // Get count of messages sent by a specific user
  const getMessagesCountForUser = (userId: string) => {
    return finalMessages.filter(m => m.senderId === userId || m.sender_id === userId).length;
  };

  // Recharts: Analytics Data
  const registrationData = [
    { name: 'Dec', count: 320 },
    { name: 'Jan', count: 480 },
    { name: 'Feb', count: 590 },
    { name: 'Mar', count: 810 },
    { name: 'Apr', count: 1100 },
    { name: 'May', count: finalUsers.length + 100 },
  ];

  const paymentShareData = [
    { name: 'Stripe Credit Cards', value: 8900, color: '#6366F1' },
    { name: 'PayPal Wallet', value: 4500, color: '#EC4899' },
    { name: 'M-Pesa Mobile', value: 6200, color: '#F59E0B' },
  ];

  // User Actions: Toggle Ban / Suspend
  const handleToggleBan = (userId: string) => {
    const fsUser = dbUsers.find(u => u.id === userId);
    if (fsUser) {
      const nextStatus = fsUser.status === 'banned' ? 'active' : 'banned';
      updateDoc(doc(db, 'users', userId), { status: nextStatus })
        .then(() => alert(`Account status of ${fsUser.fullName} has been changed to: ${nextStatus.toUpperCase()}`))
        .catch(err => console.error("Error updating user status:", err));
    } else {
      setMockProfiles((prev) =>
        prev.map((p) => {
          if (p.id.toString() === userId) {
            const nextStatus = p.status === 'banned' ? 'active' : 'banned';
            alert(`[Mock Update] Account status of ${p.name} changed to: ${nextStatus.toUpperCase()}`);
            return { ...p, status: nextStatus };
          }
          return p;
        })
      );
    }
  };

  // User Actions: Toggle Verification Badge
  const handleToggleVerify = (userId: string) => {
    const fsUser = dbUsers.find(u => u.id === userId);
    if (fsUser) {
      const nextVerify = !fsUser.verification_badge;
      updateDoc(doc(db, 'users', userId), { verification_badge: nextVerify })
        .then(() => alert(`Verification badge ${nextVerify ? 'GRANTED to' : 'REVOKED from'} ${fsUser.fullName}.`))
        .catch(err => console.error("Error updating verification badge:", err));
    } else {
      setMockProfiles((prev) =>
        prev.map((p) => {
          if (p.id.toString() === userId) {
            const nextVerify = !p.verification_badge;
            alert(`[Mock Update] Verification badge ${nextVerify ? 'GRANTED to' : 'REVOKED from'} ${p.name}.`);
            return { ...p, verification_badge: nextVerify };
          }
          return p;
        })
      );
    }
  };

  // Delete User Action
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this user profile? This action is permanent and cannot be undone.")) return;

    const fsUser = dbUsers.find(u => u.id === userId);
    if (fsUser) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        alert(`Successfully deleted user ${fsUser.fullName} from Firestore.`);
      } catch (err) {
        console.error("Error deleting user document:", err);
      }
    } else {
      setMockProfiles(prev => prev.filter(p => p.id.toString() !== userId));
      alert("[Mock Update] Successfully deleted user profile from in-memory index.");
    }
  };

  // Message Actions: Mark Read/Unread
  const handleToggleMessageRead = async (messageId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'read' ? 'unread' : 'read';
    const fsMessage = dbMessages.find(m => m.id === messageId);
    if (fsMessage) {
      try {
        if (fsMessage.refPath) {
          await updateDoc(doc(db, fsMessage.refPath), { readStatus: nextStatus });
        } else {
          await updateDoc(doc(db, 'messages', messageId), { readStatus: nextStatus });
        }
      } catch (err) {
        console.error("Error updating message status:", err);
      }
    } else {
      alert(`[Mock Update] Changed message status to: ${nextStatus.toUpperCase()}`);
    }
  };

  // Message Actions: Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message permanently from Firestore? This will remove it real-time for both participants.")) return;
    const fsMessage = dbMessages.find(m => m.id === messageId);
    if (fsMessage) {
      try {
        if (fsMessage.refPath) {
          await deleteDoc(doc(db, fsMessage.refPath));
          alert("Message document purged from Firestore successfully.");
        } else {
          await deleteDoc(doc(db, 'messages', messageId));
        }
      } catch (err) {
        console.error("Error deleting message:", err);
      }
    } else {
      alert("[Mock Update] Removed message from global log feed.");
    }
  };

  // Start chat thread from user list
  const handleStartChatWithUser = (targetUserId: string, targetUserName: string) => {
    const chatId = user.id < targetUserId
      ? `${user.id}_${targetUserId}`
      : `${targetUserId}_${user.id}`;

    setAdminActiveChatId(chatId);
    setAdminActivePartnerId(targetUserId);
    setAdminActivePartnerName(targetUserName);
    setActiveTab('messages');
  };

  // Send admin reply inside shared thread
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminActiveChatId || !adminActivePartnerId || !adminReplyInput.trim()) return;

    try {
      const chatDocRef = doc(db, 'chats', adminActiveChatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          chatId: adminActiveChatId,
          participants: [user.id, adminActivePartnerId],
          lastMessage: adminReplyInput,
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(chatDocRef, {
          lastMessage: adminReplyInput,
          updatedAt: new Date().toISOString()
        });
      }

      const messageData = {
        messageId: Math.floor(Math.random() * 1000000).toString(),
        senderId: user.id,
        senderRole: 'admin',
        receiverId: adminActivePartnerId,
        text: adminReplyInput,
        createdAt: new Date().toISOString(),
        readStatus: 'unread'
      };

      await addDoc(collection(db, 'chats', adminActiveChatId, 'messages'), messageData);

      // Create dynamic receiver notification
      await addDoc(collection(db, 'notifications'), {
        receiverId: adminActivePartnerId,
        senderId: user.id,
        senderName: user.fullName || 'Platform Administrator',
        senderProfileImage: user.profile?.avatar_url || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
        messagePreview: adminReplyInput.split(' ').slice(0, 5).join(' ') + (adminReplyInput.split(' ').length > 5 ? '...' : ''),
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setAdminReplyInput('');
    } catch (err) {
      console.error("Error sending admin reply:", err);
    }
  };

  // Filtered Lists based on search term
  const filteredUsers = finalUsers.filter(u =>
    (u.fullName || u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="pt-24 pl-72 min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col select-none">
      <main className="flex-1 p-8 overflow-y-auto">

        {/* TABS 1: METRICS OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { title: 'Total Registered', count: finalUsers.length, label: '+18% this month' },
                { title: 'Premium Members', count: finalUsers.filter((p) => p.is_premium).length, label: 'SaaS Billing VIP' },
                { title: 'Total Messages', count: finalMessages.length, label: 'Real-time Listeners' },
                { title: 'Pending Reports', count: reports.filter((r) => r.status === 'pending').length, label: 'Moderation Queue' },
                { title: 'Gateway status', count: onlineStatus ? 'ONLINE' : 'OFFLINE', label: 'Vite hot-swappable' },
              ].map((card, idx) => (
                <div key={idx} className="p-5 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{card.title}</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{card.count}</span>
                    <span className="text-[8px] text-indigo-400 font-semibold">{card.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Monthly Active Registrations</h3>
                    <p className="text-[10px] text-slate-500">Live graphical projection of incoming SaaS subscribers.</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={registrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090D16', border: '1px solid #1E293B', borderRadius: '12px' }}
                        labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#F1F5F9', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Billing Revenue Split</h3>
                  <p className="text-[10px] text-slate-500">Distribution of premium gateway checkouts.</p>
                </div>

                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentShareData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090D16', border: '1px solid #1E293B', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', color: '#F1F5F9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {paymentShareData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-400 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-white">${item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABS 2: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white">Real-Time User Directory</h3>
                <p className="text-[10px] text-slate-400">Manage registered members and configure accounts.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name/email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-56 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Profile Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Identity / Goal</th>
                    <th className="py-3 px-4 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/10">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={item.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'}
                          alt={item.fullName || item.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-800"
                        />
                        <div>
                          <span className="font-bold text-white">{item.fullName || item.name}</span>
                          {item.verification_badge && <CheckCircle className="w-3.5 h-3.5 ml-1 text-indigo-400 inline fill-current" />}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{item.email}</td>
                      <td className="py-3.5 px-4 text-slate-400 capitalize">{item.gender || 'Free'} • {item.relationship_goal || 'Long Term'}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button onClick={() => handleToggleVerify(item.id)} className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-indigo-400"><Star className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleToggleBan(item.id)} className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400"><Ban className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteUser(item.id)} className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS 3: GLOBAL MESSAGE LOG */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Real-Time SaaS Conversations ({dbChats.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Join and reply directly to live platform conversations.</p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {dbChats.map((chat) => {
                    const partnerId = chat.participants?.find((id: string) => id !== user.id) || 'unknown';
                    const partnerName = getMemberName(partnerId);
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => {
                          setAdminActiveChatId(chat.id);
                          setAdminActivePartnerId(partnerId);
                          setAdminActivePartnerName(partnerName);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${adminActiveChatId === chat.id
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{partnerName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{chat.lastMessage || 'No messages yet'}</p>
                      </button>
                    );
                  })}
                  {dbChats.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">No active chat threads found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Hand: Admin Console Reply Box */}
            <div className="lg:col-span-5 glass-card border border-slate-800 rounded-3xl p-6 flex flex-col h-[450px]">
              <div className="border-b border-slate-900 pb-4 mb-4">
                <h4 className="font-bold text-xs text-white">Console: {adminActivePartnerName}</h4>
                <p className="text-[9px] text-slate-500 font-mono">Thread Ref: {adminActiveChatId || 'None Selected'}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 text-xs">
                {adminChatMessages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin' || msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[85%] ${isAdmin ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 rounded-tl-none'
                        }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 px-1">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })}
                {!adminActiveChatId && (
                  <div className="h-full flex items-center justify-center text-slate-500 text-center py-12">
                    Select an active conversation to sync administrative stream console commands.
                  </div>
                )}
              </div>

              <form onSubmit={handleSendAdminReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder={adminActiveChatId ? "Type administrative response..." : "Select a channel first..."}
                  disabled={!adminActiveChatId}
                  value={adminReplyInput}
                  onChange={(e) => setAdminReplyInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!adminActiveChatId || !adminReplyInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 border disabled:border-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}