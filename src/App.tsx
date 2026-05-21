import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PremiumModal from './components/PremiumModal';
import { useAuth } from './contexts/AuthContext';
import { Heart } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Preloaded mock profiles for rich dashboard visuals
const INITIAL_PROFILES = [
  {
    id: 11,
    name: 'Emily Davis',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
    bio: 'Art lover, part-time barista, and full-time dog parent! Looking for a warm soul to explore galleries and local cafes. 🎨☕🐾',
    gender: 'female',
    age: 26,
    relationship_goal: 'long-term',
    interests: ['Cooking', 'Travel', 'Art', 'Photography'],
    location_name: 'Nairobi, Kenya',
    latitude: -1.294,
    longitude: 36.824,
    is_premium: true,
    verification_badge: true,
    avatar_approved: true,
    status: 'active',
    compatibility_score: 94
  },
  {
    id: 12,
    name: 'Jane Foster',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop',
    bio: 'Wanderlust driven, yoga teacher, looking for authentic connections and long sunset walks. Let\'s get boba! 🧘‍♀️🍵✨',
    gender: 'female',
    age: 28,
    relationship_goal: 'marriage',
    interests: ['Yoga', 'Cooking', 'Travel', 'Music'],
    location_name: 'Kisumu, Kenya',
    latitude: -0.1022,
    longitude: 34.7617,
    is_premium: false,
    verification_badge: false,
    avatar_approved: false, // requires moderator approval
    status: 'active',
    compatibility_score: 87
  },
  {
    id: 13,
    name: 'Marcus Vance',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop',
    bio: 'Software developer by day, hiking climber by weekend. Looking for an energetic match who loves a weekend challenge. 💻🧗‍♂️⛰️',
    gender: 'male',
    age: 29,
    relationship_goal: 'long-term',
    interests: ['Coding', 'Hiking', 'Fitness', 'Travel'],
    location_name: 'Mombasa, Kenya',
    latitude: -4.0435,
    longitude: 39.6682,
    is_premium: true,
    verification_badge: true,
    avatar_approved: true,
    status: 'active',
    compatibility_score: 72
  },
  {
    id: 14,
    name: 'Chloe Miller',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
    bio: 'Foodie, vinyl collector, and book worm. Seeking a companion to share cozy vinyl nights and experiment with new recipes! 📚🍳🎶',
    gender: 'female',
    age: 25,
    relationship_goal: 'casual',
    interests: ['Cooking', 'Music', 'Literature', 'Travel'],
    location_name: 'Nairobi, Kenya',
    latitude: -1.285,
    longitude: 36.815,
    is_premium: false,
    verification_badge: true,
    avatar_approved: true,
    status: 'active',
    compatibility_score: 91
  }
];

// Initial preloaded chat streams
const INITIAL_MESSAGES = [
  {
    id: 1001,
    sender_id: 11,
    receiver_id: 2,
    message_type: 'text' as const,
    content: 'Hi Alex! I saw your interests overlap. Do you hike around Nairobi often? ⛰️',
    media_url: '',
    is_read: false,
    created_at: '10:14 AM'
  },
  {
    id: 1002,
    sender_id: 2,
    receiver_id: 11,
    message_type: 'text' as const,
    content: 'Hey Emily! Yes, I love Ngong Hills hikes. How about you?',
    media_url: '',
    is_read: true,
    created_at: '10:16 AM'
  },
  {
    id: 1003,
    sender_id: 11,
    receiver_id: 2,
    message_type: 'text' as const,
    content: 'NGong Hills is amazing! We should plan a photo walk there sometime. 📸',
    media_url: '',
    is_read: false,
    created_at: '10:18 AM'
  }
];

export default function App() {
  const { user, userData, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  
  // Real-time states
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [mockProfiles, setMockProfiles] = useState(INITIAL_PROFILES);
  const [mockMessages, setMockMessages] = useState(INITIAL_MESSAGES);
  
  // Local profile overrides (e.g. premium status or avatar updates)
  const [localProfileOverride, setLocalProfileOverride] = useState<any>(null);

  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, title: 'It\'s a Match! 🎉', body: 'You and Emily Davis liked each other. Let\'s chat!', type: 'match', is_read: false, created_at: '1 hour ago' },
    { id: 2, title: 'Photo Verified! 📸', body: 'System admin verified your avatar. Star is active!', type: 'system', is_read: true, created_at: '2 hours ago' }
  ]);

  // Construct active currentUser synchronized with AuthState
  const currentUser = userData ? {
    id: userData.uid,
    name: localProfileOverride?.name || userData.fullName,
    email: userData.email,
    role: userData.role || 'user',
    profile: {
      avatar_url: localProfileOverride?.profile?.avatar_url || userData.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      bio: localProfileOverride?.profile?.bio || 'Art lover, part-time barista, and full-time dog parent! Looking for a warm soul to explore galleries and local cafes. 🎨☕🐾',
      gender: localProfileOverride?.profile?.gender || (userData.provider === 'google' ? 'female' : 'male'),
      preference_gender: localProfileOverride?.profile?.preference_gender || 'female',
      relationship_goal: localProfileOverride?.profile?.relationship_goal || 'long-term',
      interests: localProfileOverride?.profile?.interests || ['Cooking', 'Travel', 'Art', 'Photography'],
      location_name: localProfileOverride?.profile?.location_name || 'Nairobi, Kenya',
      is_premium: localProfileOverride?.profile?.is_premium || false,
      verification_badge: localProfileOverride?.profile?.verification_badge || (userData.provider === 'google'),
      profile_completed: localProfileOverride?.profile?.profile_completed || 60,
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin,
      provider: userData.provider
    }
  } : null;

  // Protect and separate role-based tabs (RBAC route enforcement)
  useEffect(() => {
    if (!currentUser) return;
    
    const adminTabs = ['overview', 'users', 'moderation', 'reports', 'settings'];
    const userTabs = ['discover', 'messages', 'filters', 'profile', 'premium'];
    
    if (currentUser.role === 'admin') {
      if (!adminTabs.includes(activeTab)) {
        setActiveTab('overview');
      }
    } else {
      if (!userTabs.includes(activeTab)) {
        setActiveTab('discover');
      }
    }
  }, [currentUser?.role, activeTab]);

  // Real-time Firestore notifications listener
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.receiverId === currentUser.id) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      
      const mapped = list.map((n) => ({
        id: n.id,
        title: `Message from ${n.senderName} 💬`,
        body: n.messagePreview,
        type: 'message',
        is_read: n.isRead,
        created_at: n.createdAt
          ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Just now'
      }));

      // Add a couple of initial fallback welcome notifications if list is empty for maximum wow-factor visual feedback
      if (mapped.length === 0) {
        setNotifications([
          { id: 'welcome-1', title: "It's a Match! 🎉", body: 'You and Emily Davis liked each other. Let\'s chat!', type: 'match', is_read: false, created_at: '1 hour ago' },
          { id: 'welcome-2', title: 'Photo Verified! 📸', body: 'System admin verified your avatar. Star is active!', type: 'system', is_read: true, created_at: '2 hours ago' }
        ]);
      } else {
        setNotifications(mapped);
      }
    }, (err) => {
      console.error("Error listening to Firestore notifications:", err);
    });

    return unsubscribe;
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center animate-pulse shadow-lg shadow-pink-500/20">
            <Heart className="w-8 h-8 text-white fill-current animate-ping" />
          </div>
          <h2 className="text-white font-black tracking-wider uppercase text-xs mt-2 text-gradient">
            Dream Match Compatibility Engine
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Establishing Secure Handshake...
          </p>
        </div>
      </div>
    );
  }



  const handleUpgradePremium = (planName: string, gateway: string, amount: number) => {
    if (!currentUser) return;
    
    const updatedOverride = {
      ...currentUser,
      profile: {
        ...currentUser.profile,
        is_premium: true,
        verification_badge: true
      }
    };
    setLocalProfileOverride(updatedOverride);
    setShowPremiumModal(false);
    
    // Add success notification
    const upgradeAlert = {
      id: Date.now(),
      title: 'Upgrade Successful! ✨',
      body: `Thank you for upgrading. Your Premium ${planName.toUpperCase()} is active!`,
      type: 'system',
      is_read: false,
      created_at: 'Just now'
    };
    setNotifications((prev) => [upgradeAlert, ...prev]);
  };

  const handleLogout = async () => {
    await logout();
    setLocalProfileOverride(null);
    setActiveTab('discover');
  };

  const handleSaveProfileOverride = (updatedUser: any) => {
    setLocalProfileOverride(updatedUser);
  };

  // Dynamic automatic response generator
  const sendMockReply = (partnerId: number) => {
    const partner = mockProfiles.find((p) => p.id === partnerId);
    if (!partner || !currentUser) return;

    const replies = [
      `That sounds so interesting! Tell me more about it. 😊`,
      `Haha, that is true! I completely agree with you on that one.`,
      `Honestly, that makes so much sense. By the way, what are your plans for the weekend? ☕`,
      `Wow! That is awesome. Check out this picture I took recently! 📸`,
      `I\'m super glad we matched. Your vibe feels incredibly compatible! ✨`
    ];

    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    setTimeout(() => {
      const isPhoto = Math.random() < 0.2; // 20% chance of photo response
      const replyMsg = {
        id: Date.now(),
        sender_id: partnerId,
        receiver_id: currentUser.id,
        message_type: isPhoto ? ('image' as const) : ('text' as const),
        content: isPhoto ? 'Check this out! 🌟' : randomReply,
        media_url: isPhoto ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop' : '',
        is_read: false,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMockMessages((prev) => [...prev, replyMsg]);

      // Trigger Alert notifications sound/badge
      const chatNotification = {
        id: Date.now() + 1,
        title: `Message from ${partner.name}`,
        body: isPhoto ? 'Sent a photo 📸' : randomReply,
        type: 'message',
        is_read: false,
        created_at: 'Just now'
      };
      setNotifications((prev) => [chatNotification, ...prev]);
    }, 1500);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none antialiased">
      {/* Logged Out view: Portal gateway */}
      {!currentUser ? (
        <LandingPage />
      ) : (
        <div className="flex">
          {/* Side Nav sticky panel */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            role={currentUser.role}
            userName={currentUser.name}
            isPremium={currentUser.profile.is_premium}
            onLogout={handleLogout}
          />

          {/* Core container right half */}
          <div className="flex-1 min-w-0">
            {/* Header top row */}
            <Header
              userName={currentUser.name}
              role={currentUser.role}
              isPremium={currentUser.profile.is_premium}
              onlineStatus={onlineStatus}
              setOnlineStatus={setOnlineStatus}
              notifications={notifications}
              markNotificationsAsRead={markNotificationsAsRead}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
            />

            {/* Dashboards based on roles */}
            {currentUser.role === 'admin' ? (
              <AdminDashboard
                user={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mockProfiles={mockProfiles}
                setMockProfiles={setMockProfiles}
                mockMessages={mockMessages}
                onlineStatus={onlineStatus}
              />
            ) : (
              <UserDashboard
                user={currentUser}
                setUser={handleSaveProfileOverride}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpgradePremium={(plan, gate, amt) => {
                  setShowPremiumModal(true);
                }}
                mockProfiles={mockProfiles}
                setMockProfiles={setMockProfiles}
                mockMessages={mockMessages}
                setMockMessages={setMockMessages}
                sendMockReply={sendMockReply}
                onlineStatus={onlineStatus}
              />
            )}
          </div>

          {/* Premium Billing Checkout dialog */}
          {showPremiumModal && (
            <PremiumModal
              onClose={() => setShowPremiumModal(false)}
              onUpgrade={handleUpgradePremium}
            />
          )}
        </div>
      )}
    </div>
  );
}
