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
  mockProfiles,
  setMockProfiles,
  mockMessages,
  onlineStatus
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

  // Moderation Actions: Approve Avatar
  const handleModerationDecision = (profileId: number, decision: 'approve' | 'reject') => {
    setMockProfiles((prev) =>
      prev.map((p) => {
        if (p.id === profileId) {
          if (decision === 'approve') {
            alert(`Avatar photo of ${p.name} approved successfully.`);
            return { ...p, avatar_approved: true, verification_badge: true };
          } else {
            alert(`Avatar photo of ${p.name} rejected. Image cleared.`);
            return { ...p, avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop', avatar_approved: false };
          }
        }
        return p;
      })
    );
  };

  // Reports Actions: Resolve abuse logs
  const handleResolveReport = (reportId: number, action: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          alert(`Report #${reportId} resolved with action taken: ${action.toUpperCase()}`);
          return { ...r, status: 'resolved', action_taken: action };
        }
        return r;
      })
    );
  };

  // Simulated Excel/CSV Export
  const handleExportCSV = () => {
    alert('Simulated Analytical Export!\n"dreammatch_analytics_metrics.csv" compiled and downloaded successfully via REST API stream.');
  };

  // Filtered Lists based on search term
  const filteredUsers = finalUsers.filter(u =>
    (u.fullName || u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredMessages = finalMessages.filter(m => {
    const sender = getMemberName(m.senderId || m.sender_id || '');
    const text = m.messageText || m.content || '';
    const matchesSearch = sender.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
      text.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
      (m.chatId || '').toLowerCase().includes(messageSearchTerm.toLowerCase());

    if (messageFilterStatus === 'all') return matchesSearch;
    return matchesSearch && m.readStatus === messageFilterStatus;
  });

  return (
    <div className="pt-24 pl-72 min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col select-none">
      <main className="flex-1 p-8 overflow-y-auto">

        {/* TABS 1: METRICS OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* Top stats metrics cards row */}
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

            {/* Graphs Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left chart card */}
              <div className="lg:col-span-2 glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Monthly Active Registrations</h3>
                    <p className="text-[10px] text-slate-500">Live graphical projection of incoming SaaS subscribers.</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
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

              {/* Right PieChart card */}
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

        {/* TABS 2: REAL-TIME USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">

            {/* Search Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white">Real-Time User Directory</h3>
                <p className="text-[10px] text-slate-400">Manage registered dating members, verify account details, or execute permanent purges.</p>
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
                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl font-bold tracking-wider">
                  {filteredUsers.length} Active Records
                </span>
              </div>
            </div>

            {/* Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Profile Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Identity / Goal</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4">Role / State</th>
                    <th className="py-3 px-4 text-right">Moderator Controls</th>
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForModal(item)}
                              className="font-bold text-white hover:text-indigo-400 transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
                            >
                              {item.fullName || item.name}
                            </button>
                            {item.verification_badge && (
                              <CheckCircle className="w-3.5 h-3.5 text-indigo-400 fill-current" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono">ID: {item.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{item.email}</td>
                      <td className="py-3.5 px-4 text-slate-400 capitalize">
                        <div className="flex flex-col">
                          <span>{item.gender || 'Free'} • {item.relationship_goal?.replace('-', ' ') || 'Long Term'}</span>
                          <span className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                            💬 {getMessagesCountForUser(item.id)} Messages Sent
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-650" />
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Pre-seed'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[8px] uppercase tracking-widest font-extrabold text-gradient">
                            {item.role || 'user'}
                          </span>
                          {item.status === 'banned' ? (
                            <span className="text-[8px] bg-red-950 text-red-400 border border-red-900/50 rounded-full px-1.5 py-0.2 font-bold uppercase tracking-wider">
                              Suspended
                            </span>
                          ) : item.is_premium ? (
                            <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-900/50 rounded-full px-1.5 py-0.2 font-bold uppercase tracking-wider">
                              Premium
                            </span>
                          ) : (
                            <span className="text-[8px] bg-slate-900 text-slate-400 border border-slate-800 rounded-full px-1.5 py-0.2 font-medium">
                              Free Tier
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {/* Grant Verify badge */}
                        <button
                          onClick={() => handleToggleVerify(item.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${item.verification_badge
                              ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-indigo-400'
                            }`}
                          title="Grant verification badge"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        {/* Ban suspension switch */}
                        <button
                          onClick={() => handleToggleBan(item.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${item.status === 'banned'
                              ? 'bg-red-950/20 border-red-900/50 text-red-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-red-400'
                            }`}
                          title={item.status === 'banned' ? 'Activate Account' : 'Suspend Account'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        {/* Start Live Chat */}
                        <button
                          onClick={() => handleStartChatWithUser(item.id, item.fullName || item.name)}
                          className="p-1.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-900/60 transition-colors cursor-pointer"
                          title="Chat with user"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete permanently */}
                        <button
                          onClick={() => handleDeleteUser(item.id)}
                          className="p-1.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-900/60 transition-colors cursor-pointer"
                          title="Execute account wipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No directory records match "{userSearchTerm}".
                </div>
              )}
            </div>
          </div>
        )}
        {/* TABS 3: GLOBAL MESSAGE LOG */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Hand: All Chats & Audit Feed */}
            <div className="lg:col-span-7 space-y-6">

              {/* Top Chats Room Quick Selector */}
              <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Real-Time SaaS Conversations ({dbChats.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Join and reply directly inside any active user conversation channel.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {dbChats.map((c) => {
                    const partnerId = c.participants?.find((p: string) => p !== user.id) || 'unknown';
                    const partnerName = getMemberName(partnerId);
                    const isActive = adminActiveChatId === c.chatId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setAdminActiveChatId(c.chatId);
                          setAdminActivePartnerId(partnerId);
                          setAdminActivePartnerName(partnerName);
                        }}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${isActive
                            ? 'bg-indigo-950/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                            : 'bg-slate-900/60 border-slate-850 hover:border-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-white">{partnerName}</span>
                          <span className="text-[8px] bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 font-mono">Room: {c.chatId.slice(0, 8)}...</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-1.5 w-full">
                          {c.lastMessage || 'No messages yet'}
                        </p>
                      </button>
                    );
                  })}
                  {dbChats.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-slate-500 text-[10px]">
                      No active database chat rooms found.
                    </div>
                  )}
                </div>
              </div>

              {/* Main Compliance Monitor Feed */}
              <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>Compliance Audit Stream</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search text/chatId..."
                        value={messageSearchTerm}
                        onChange={(e) => setMessageSearchTerm(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-44 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredMessages.map((msg) => {
                    const isRoomActive = adminActiveChatId === msg.chatId;
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-2xl border transition-all flex justify-between items-start gap-4 ${isRoomActive
                            ? 'bg-indigo-950/15 border-indigo-500/50 shadow-md shadow-indigo-650/10'
                            : msg.readStatus === 'unread'
                              ? 'bg-indigo-950/5 border-indigo-900/40'
                              : 'bg-slate-900/30 border-slate-850'
                          }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs text-white">{getMemberName(msg.senderId || msg.sender_id)}</span>
                            <span className="text-slate-650">➜</span>
                            <span className="font-bold text-xs text-white">{getMemberName(msg.receiverId || msg.receiver_id)}</span>
                          </div>

                          <p className="text-[11px] text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-900 max-w-md">
                            {msg.messageText || msg.text || msg.content}
                          </p>

                          <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-semibold font-mono">
                            <button
                              onClick={() => {
                                const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
                                handleStartChatWithUser(partnerId, getMemberName(partnerId));
                              }}
                              className="text-indigo-400 hover:underline cursor-pointer"
                            >
                              Join room: {msg.chatId}
                            </button>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleToggleMessageRead(msg.id, msg.readStatus)}
                            className="p-1 rounded-lg border bg-slate-900 border-slate-800 text-[8px] text-slate-400 hover:text-white"
                          >
                            Read
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 rounded-lg border bg-slate-900 border-slate-800 text-slate-550 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Hand: Admin Live Chat Control Console */}
            <div className="lg:col-span-5">
              <div className="glass-card border border-slate-800 rounded-3xl p-6 h-full flex flex-col justify-between min-h-[500px]">

                {adminActiveChatId ? (
                  <div className="flex flex-col h-full justify-between flex-1">
                    {/* Console Header */}
                    <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center font-black text-xs text-white">
                          {adminActivePartnerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white leading-none">{adminActivePartnerName}</h4>
                          <span className="text-[9px] text-slate-500 mt-1 block font-mono">Chat Room: {adminActiveChatId.slice(0, 16)}...</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setAdminActiveChatId(null);
                          setAdminActivePartnerId(null);
                        }}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-400 hover:text-white"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Console Live Messages Feed */}
                    <div className="flex-1 my-4 overflow-y-auto max-h-[360px] space-y-3.5 pr-1.5 pt-2">
                      {adminChatMessages.map((m) => {
                        const isAdmin = m.senderRole === 'admin' || m.senderId === user.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${isAdmin
                                  ? 'bg-gradient-brand text-white border-0 rounded-tr-none'
                                  : 'bg-slate-900 text-slate-100 border border-slate-850 rounded-tl-none'
                                }`}
                            >
                              <div className="flex items-center gap-1.5 justify-between mb-1 opacity-70 text-[8px] font-semibold uppercase">
                                <span>{isAdmin ? 'You (Admin)' : adminActivePartnerName}</span>
                                <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                              </div>
                              <p className="leading-relaxed font-medium">{m.text}</p>
                            </div>
                          </div>
                        );
                      })}
                      {adminChatMessages.length === 0 && (
                        <div className="text-center py-16 text-slate-500 text-[10px]">
                          No message logs in this thread yet. Send a greeting below!
                        </div>
                      )}
                    </div>

                    {/* Reply Input Form */}
                    <form onSubmit={handleSendAdminReply} className="border-t border-slate-850 pt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder={`Reply directly to ${adminActivePartnerName}...`}
                        value={adminReplyInput}
                        onChange={(e) => setAdminReplyInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-gradient-brand hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-opacity cursor-pointer"
                      >
                        Reply
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-20 my-auto space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">Live Chat Console Desk</h4>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                        Select an active room or click the message bubble next to any user directory record to participate in chats in real time.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* TABS 4: PHOTO MODERATION GRID */}
        {activeTab === 'moderation' && (
          <div className="glass-card border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-white">Avatar Photo Vetting Suite</h3>
              <p className="text-[10px] text-slate-400">Moderate submitted profile pictures to filter out fake accounts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {mockProfiles.slice(0, 4).map((p) => (
                <div key={p.id} className="bg-slate-900/60 rounded-3xl border border-slate-800 p-4 space-y-3.5 flex flex-col justify-between">
                  <div className="relative group overflow-hidden rounded-2xl border border-slate-800 h-44">
                    <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{p.name}</h4>
                    <span className="text-[9px] text-slate-500 font-mono">UID: {p.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModerationDecision(p.id, 'approve')}
                      className="flex-1 py-2 bg-indigo-950/20 border border-indigo-900/50 hover:bg-indigo-900/30 text-indigo-400 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerationDecision(p.id, 'reject')}
                      className="flex-1 py-2 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-400 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABS 5: SECURITY CREDENTIALS */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto glass-card border border-slate-800 rounded-3xl p-8 space-y-6">
            <div>
              <h3 className="font-black text-lg text-white">SaaS Configuration Keys</h3>
              <p className="text-[10px] text-slate-400">Manage Stripe webhooks, SMTP relays, and OAuth secrets.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setSettingsSuccess(true); setTimeout(() => setSettingsSuccess(false), 3000); }} className="space-y-4 pt-2">
              {settingsSuccess && (
                <div className="p-3 bg-green-950/30 border border-green-900/50 text-green-400 rounded-xl text-xs font-semibold animate-fade-in">
                  ✓ Configuration updated successfully. Gateway parameters re-cached!
                </div>
              )}

              <div>
                <label className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-2">Stripe Checkout Key</label>
                <input
                  type="text"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-2">Relay Mail Host</label>
                <input
                  type="text"
                  value={mailServer}
                  onChange={(e) => setMailServer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-2">Encryption Signature</label>
                <input
                  type="password"
                  value={securitySecret}
                  onChange={(e) => setSecuritySecret(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  Update Configuration Keys
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* USER AUDIT DETAIL PROFILE MODAL */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-card border border-slate-800 rounded-3xl p-8 space-y-6 relative animate-zoom-in">
            <button
              onClick={() => setSelectedUserForModal(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white text-lg font-bold border-0 bg-transparent cursor-pointer p-0"
            >
              ×
            </button>

            <div className="flex items-center gap-4 border-b border-slate-900 pb-5">
              <img
                src={selectedUserForModal.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'}
                alt={selectedUserForModal.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
              />
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                  <span>{selectedUserForModal.fullName || selectedUserForModal.name}</span>
                  {selectedUserForModal.verification_badge && (
                    <CheckCircle className="w-4 h-4 text-indigo-400 fill-current animate-pulse" />
                  )}
                </h3>
                <span className="text-[10px] text-indigo-400 font-mono">{selectedUserForModal.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/50 p-4.5 rounded-2xl border border-slate-850/60">
                <span className="block text-[8px] uppercase text-slate-500 font-bold tracking-widest mb-1">User Identifier</span>
                <span className="font-mono text-white text-[10px] break-all">{selectedUserForModal.id}</span>
              </div>

              <div className="bg-slate-900/50 p-4.5 rounded-2xl border border-slate-850/60">
                <span className="block text-[8px] uppercase text-slate-500 font-bold tracking-widest mb-1">Role Permission</span>
                <span className="text-indigo-400 font-black uppercase text-[10px] tracking-wider">{selectedUserForModal.role || 'user'}</span>
              </div>

              <div className="bg-slate-900/50 p-4.5 rounded-2xl border border-slate-850/60">
                <span className="block text-[8px] uppercase text-slate-500 font-bold tracking-widest mb-1">Match Preference</span>
                <span className="text-slate-200 capitalize font-bold text-[10px]">
                  {selectedUserForModal.gender || 'Female'} • {selectedUserForModal.relationship_goal?.replace('-', ' ') || 'Long term'}
                </span>
              </div>

              <div className="bg-slate-900/50 p-4.5 rounded-2xl border border-slate-850/60">
                <span className="block text-[8px] uppercase text-slate-500 font-bold tracking-widest mb-1">System Status</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${selectedUserForModal.status === 'banned'
                    ? 'bg-red-950 border border-red-900 text-red-400'
                    : 'bg-green-950 border border-green-900 text-green-400'
                  }`}>
                  {selectedUserForModal.status === 'banned' ? 'Suspended' : 'Active'}
                </span>
              </div>

              <div className="bg-slate-900/50 p-4.5 rounded-2xl border border-slate-850/60 col-span-2 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] uppercase text-slate-500 font-bold tracking-widest mb-1">Activity Log</span>
                  <span className="text-slate-400 text-[10px]">Total Platform Chat Activity</span>
                </div>
                <span className="text-indigo-300 font-black text-sm bg-indigo-950/40 border border-indigo-900/50 rounded-xl px-3 py-1">
                  💬 {getMessagesCountForUser(selectedUserForModal.id)} Messages
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { handleToggleVerify(selectedUserForModal.id); setSelectedUserForModal(null); }}
                className="flex-1 py-3 rounded-xl bg-indigo-950 border border-indigo-900 hover:border-indigo-800 text-xs font-bold text-indigo-400 transition-colors cursor-pointer"
              >
                Toggle Star Badge
              </button>
              <button
                onClick={() => { handleToggleBan(selectedUserForModal.id); setSelectedUserForModal(null); }}
                className="flex-1 py-3 rounded-xl bg-red-950/20 border border-red-900/50 hover:bg-red-900/40 text-xs font-bold text-red-400 transition-colors cursor-pointer"
              >
                {selectedUserForModal.status === 'banned' ? 'Activate Account' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
