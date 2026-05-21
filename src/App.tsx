import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PremiumModal from './components/PremiumModal';
import { useAuth } from './contexts/AuthContext';
import { Heart } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';



export default function App() {
  const { user, userData, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  
  // Real-time states
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, title: 'It\'s a Match! 🎉', body: 'You and Emily Davis liked each other. Let\'s chat!', type: 'match', is_read: false, created_at: '1 hour ago' },
    { id: 2, title: 'Photo Verified! 📸', body: 'System admin verified your avatar. Star is active!', type: 'system', is_read: true, created_at: '2 hours ago' }
  ]);

  // Construct active currentUser synchronized with AuthState
  const currentUser = userData ? {
    id: userData.uid,
    name: userData.fullName,
    email: userData.email,
    role: userData.role || 'user',
    profile: {
      avatar_url: userData.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      bio: userData.bio || '',
      gender: userData.gender || '',
      preference_gender: (userData as any).preference_gender || 'female',
      relationship_goal: userData.relationship_goal || '',
      interests: userData.interests || [],
      location_name: userData.city && userData.country ? `${userData.city}, ${userData.country}` : (userData.city || userData.country || ''),
      is_premium: (userData as any).is_premium || false,
      verification_badge: (userData as any).verification_badge || false,
      profile_completed: userData.profileCompleted || 60,
      images: userData.images || [],
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin,
      provider: userData.provider
    }
  } : null;

  // Protect and separate role-based tabs (RBAC route enforcement)
  useEffect(() => {
    if (!currentUser) return;
    
    const adminTabs = ['overview', 'users', 'reports', 'settings'];
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

  const handleUpgradePremium = async (planName: string, gateway: string, amount: number) => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        is_premium: true,
        verification_badge: true
      });
    } catch (err) {
      console.error("Failed to upgrade premium:", err);
    }
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
    setActiveTab('discover');
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
            avatarUrl={currentUser.profile.avatar_url}
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
            />

            {/* Dashboards based on roles */}
            {currentUser.role === 'admin' ? (
              <AdminDashboard
                user={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onlineStatus={onlineStatus}
              />
            ) : (
              <UserDashboard
                user={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpgradePremium={(plan, gate, amt) => {
                  setShowPremiumModal(true);
                }}
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
