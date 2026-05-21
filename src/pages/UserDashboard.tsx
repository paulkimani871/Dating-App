import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Star, User, MessageCircle, MapPin, Heart, 
  Shield, Settings, Sliders, CheckCircle, Target, Sparkle, 
  Camera, LogOut, Calendar, Search 
} from 'lucide-react';
import SwipeCard from '../components/SwipeCard';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, addDoc, doc, getDoc, setDoc, 
  updateDoc, query, onSnapshot, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

interface UserDashboardProps {
  user: any;
  setUser: (user: any) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpgradePremium: (planName: string, gateway: string, amount: number) => void;
  mockProfiles: any[];
  setMockProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  mockMessages: any[];
  setMockMessages: React.Dispatch<React.SetStateAction<any[]>>;
  sendMockReply: (partnerId: number) => void;
  onlineStatus: boolean;
}

export default function UserDashboard({
  user,
  setUser,
  activeTab,
  setActiveTab,
  onUpgradePremium,
  mockProfiles,
  setMockProfiles,
  mockMessages,
  setMockMessages,
  sendMockReply,
  onlineStatus
}: UserDashboardProps) {
  const { logout } = useAuth();
  
  // Real-time Firestore States
  const [dbUsersList, setDbUsersList] = useState<any[]>([]);
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  
  // Swipe deck index tracker
  const [swipeIdx, setSwipeIdx] = useState(0);

  // Filters State
  const [filterGender, setFilterGender] = useState('everyone');
  const [filterGoal, setFilterGoal] = useState('all');
  const [filterAge, setFilterAge] = useState(30);

  // Active chat state
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | number | null>(null);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');

  // Profile Edit State
  const [editName, setEditName] = useState(user.name);
  const [editBio, setEditBio] = useState(user.profile.bio || '');
  const [editGoal, setEditGoal] = useState(user.profile.relationship_goal);
  const [editPrefGender, setEditPrefGender] = useState(user.profile.preference_gender);
  const [newAvatarUrl, setNewAvatarUrl] = useState(user.profile.avatar_url);
  const [selectedInterest, setSelectedInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Listen to all registered users from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => {
        // Exclude the current logged-in user from the list
        if (doc.id !== user.id) {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setDbUsersList(usersList);
    }, (err) => {
      console.error("Error listening to users collection:", err);
    });

    return unsubscribe;
  }, [user.id]);

  // Listen to active chat room messages in real-time whenever selected partner changes
  useEffect(() => {
    if (!selectedPartnerId) {
      setActiveChatMessages([]);
      return;
    }

    const chatId = user.id < selectedPartnerId 
      ? `${user.id}_${selectedPartnerId}` 
      : `${selectedPartnerId}_${user.id}`;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setActiveChatMessages(msgs);
    }, (err) => {
      console.error("Error listening to active chat messages:", err);
    });

    return unsubscribe;
  }, [selectedPartnerId, user.id]);

  // Mark notifications as read inside Firestore when chat partner changes
  useEffect(() => {
    if (!selectedPartnerId || !user.id) return;

    const q = query(collection(db, 'notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId === selectedPartnerId.toString() && data.receiverId === user.id && !data.isRead) {
          updateDoc(doc(db, 'notifications', docSnap.id), { isRead: true }).catch(err => {
            console.error("Error marking notification read in Firestore:", err);
          });
        }
      });
    }, (err) => {
      console.error("Error listening to notifications for read-marking:", err);
    });

    return unsubscribe;
  }, [selectedPartnerId, user.id]);

  // Merge Sidebar members: combine Firestore active users + fallback mock profiles
  const finalSidebarUsers = dbUsersList.length > 0
    ? dbUsersList.filter(u => 
        (u.fullName || u.name || '').toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(chatSearchTerm.toLowerCase())
      )
    : mockProfiles.map(p => ({
        id: p.id,
        fullName: p.name,
        email: `${p.name.toLowerCase().replace(' ', '')}@example.com`,
        profileImage: p.avatar_url,
        provider: 'email',
        role: 'user',
        online_status: p.online_status
      })).filter(u => 
        u.fullName.toLowerCase().includes(chatSearchTerm.toLowerCase())
      );

  // Swipe Action Handlers
  const handleSwipe = (action: 'like' | 'dislike', score: number) => {
    const currentCard = getFilteredCandidates()[swipeIdx];
    if (!currentCard) return;

    if (action === 'like') {
      const isMutual = Math.random() < 0.6 || score > 80;
      if (isMutual) {
        alert(`🎉 It's a Mutual Match! You and ${currentCard.name} liked each other! Start chatting in the messages tab.`);
        
        // Setup initial default message inside Firestore chat subcollection
        const chatId = user.id < currentCard.id.toString() 
          ? `${user.id}_${currentCard.id}` 
          : `${currentCard.id}_${user.id}`;
        
        const chatDocRef = doc(db, 'chats', chatId);
        setDoc(chatDocRef, {
          chatId,
          participants: [user.id, currentCard.id.toString()],
          lastMessage: `Hey! I saw we have a ${score}% match compatibility. Let's chat! 👋`,
          updatedAt: new Date().toISOString()
        }).then(() => {
          addDoc(collection(db, 'chats', chatId, 'messages'), {
            messageId: Math.floor(Math.random() * 1000000).toString(),
            senderId: currentCard.id.toString(),
            receiverId: user.id,
            text: `Hey! I saw we have a ${score}% match compatibility. Let's chat! 👋`,
            createdAt: new Date().toISOString(),
            readStatus: 'unread'
          });
        }).catch(err => console.error("Error provisioning mutual match chat:", err));
      }
    }

    setSwipeIdx(swipeIdx + 1);
  };

  const handleFavorite = (userId: number) => {
    alert('Added to your favorite profile list! ⭐️');
  };

  const handleBlock = (userId: number) => {
    alert('User has been blocked. They will no longer appear in your recommendation matches.');
  };

  // Profile Form Submissions
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedUser = {
      ...user,
      name: editName,
      profile: {
        ...user.profile,
        bio: editBio,
        relationship_goal: editGoal,
        preference_gender: editPrefGender,
        avatar_url: newAvatarUrl,
        profile_completed: 100
      }
    };
    setUser(updatedUser);
    
    // Also save display name & profile bio inside Firestore
    const userDocRef = doc(db, 'users', user.id);
    updateDoc(userDocRef, {
      fullName: editName,
      profileImage: newAvatarUrl
    }).then(() => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }).catch(err => console.error("Error saving Firestore profile:", err));
  };

  const handleAddInterest = () => {
    if (!selectedInterest) return;
    if (user.profile.interests.includes(selectedInterest)) return;
    
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        interests: [...user.profile.interests, selectedInterest]
      }
    };
    setUser(updatedUser);
    setSelectedInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        interests: user.profile.interests.filter((i: string) => i !== interest)
      }
    };
    setUser(updatedUser);
  };

  const handleAvatarUpload = () => {
    const defaultAvatars = [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    setNewAvatarUrl(randomAvatar);
    
    // Auto-update state
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        avatar_url: randomAvatar
      }
    };
    setUser(updatedUser);
  };

  // Filter recommendations matching preferences
  const getFilteredCandidates = () => {
    return mockProfiles.filter((candidate) => {
      if (filterGender !== 'everyone' && candidate.gender !== filterGender) return false;
      if (filterGoal !== 'all' && candidate.relationship_goal !== filterGoal) return false;
      if (candidate.age > filterAge) return false;
      return true;
    });
  };

  // Send Chat Message action
  const handleSendChatMessage = async (content: string, type: 'text' | 'image' = 'text', mediaUrl = '', replyTo?: string) => {
    if (!selectedPartnerId) return;

    const chatId = user.id < selectedPartnerId 
      ? `${user.id}_${selectedPartnerId}` 
      : `${selectedPartnerId}_${user.id}`;

    try {
      // 1. Provision parent chat document
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          chatId,
          participants: [user.id, selectedPartnerId.toString()],
          lastMessage: content,
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(chatDocRef, {
          lastMessage: content,
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Add message document to subcollection
      const messageData = {
        messageId: Math.floor(Math.random() * 1000000).toString(),
        senderId: user.id,
        receiverId: selectedPartnerId.toString(),
        text: content,
        createdAt: new Date().toISOString(),
        readStatus: 'unread',
        message_type: type,
        media_url: mediaUrl,
        replyTo: replyTo || ''
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

      // 3. Write Notification document to Firestore for the receiver
      await addDoc(collection(db, 'notifications'), {
        receiverId: selectedPartnerId.toString(),
        senderId: user.id,
        senderName: user.name || 'Dating Member',
        senderProfileImage: user.profile?.avatar_url || '',
        messagePreview: content.split(' ').slice(0, 5).join(' ') + (content.split(' ').length > 5 ? '...' : ''),
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error sending real-time message:", err);
    }
  };

  // Map messages to ChatBox message shape
  const mappedMessages = activeChatMessages.map((m) => ({
    id: m.messageId || m.id,
    sender_id: m.senderId,
    receiver_id: m.receiverId,
    message_type: m.message_type || 'text',
    content: m.text || m.messageText || '',
    media_url: m.media_url || '',
    is_read: m.readStatus === 'read',
    replyTo: m.replyTo || '',
    created_at: m.createdAt 
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  }));

  // Resolve active partner metadata
  const activePartnerMeta = finalSidebarUsers.find(u => u.id === selectedPartnerId) || {
    id: selectedPartnerId || '',
    fullName: 'Chat Partner',
    email: '',
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
    online_status: true
  };

  const partnerObject = {
    id: typeof activePartnerMeta.id === 'number' ? activePartnerMeta.id : 999,
    name: activePartnerMeta.fullName || activePartnerMeta.name || 'Chat Partner',
    profile: {
      avatar_url: activePartnerMeta.profileImage || activePartnerMeta.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      location_name: 'Nairobi, Kenya',
      is_premium: false,
      online_status: activePartnerMeta.online_status || true
    }
  };

  return (
    <div className="pt-24 pl-72 min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col select-none">
      <main className="flex-1 p-8 overflow-y-auto">

        {/* TABS 1: DISCOVER DECKS SWIPING */}
        {activeTab === 'discover' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left swiper profile card container */}
            <div className="lg:col-span-2">
              {swipeIdx < getFilteredCandidates().length ? (
                <SwipeCard
                  profile={getFilteredCandidates()[swipeIdx]}
                  onSwipe={handleSwipe}
                  onFavorite={handleFavorite}
                  onBlock={handleBlock}
                />
              ) : (
                <div className="h-[460px] glass-card border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-white text-base">Recommendation Stack Exhausted</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 leading-normal">
                    We've filtered all potential matches. Tweak your advanced search age ranges or interest goals to recalculate recommendations!
                  </p>
                  <button
                    onClick={() => setActiveTab('filters')}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 hover:border-indigo-750 text-indigo-400 hover:text-indigo-300 font-bold text-xs transition-colors"
                  >
                    Adjust Match Parameters
                  </button>
                </div>
              )}
            </div>

            {/* Right sidebar quick details panel */}
            <div className="space-y-6">
              
              {/* Profile complete gauge */}
              <div className="p-6 rounded-3xl glass-card border border-slate-800/80 space-y-4">
                <h3 className="font-bold text-sm text-white">Dating Profile Strength</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border-4 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center font-bold text-xs text-indigo-300">
                    {user.profile.profile_completed}%
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">Almost Compatibility Ready!</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Completed profiles receive up to 45% better match suggestions.
                    </p>
                  </div>
                </div>
                {user.profile.profile_completed < 100 && (
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Complete your profile
                  </button>
                )}
              </div>

              {/* Quick messages mini panel */}
              <div className="p-6 rounded-3xl glass-card border border-slate-800/80 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center justify-between">
                  <span>Active Members</span>
                  <MessageCircle className="w-4 h-4 text-indigo-400" />
                </h3>
                
                <div className="space-y-3">
                  {finalSidebarUsers.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedPartnerId(item.id); setActiveTab('messages'); }}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 flex items-center gap-3 cursor-pointer transition-colors"
                    >
                      <img
                        src={item.profileImage || item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                        alt={item.fullName || item.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-semibold text-xs text-white truncate">{item.fullName || item.name}</h4>
                        <p className="text-[9px] text-slate-500 truncate">{item.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TABS 2: LARGE MESSAGES WORKSPACE */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-10rem)]">
            
            {/* Left threads column list */}
            <div className="lg:col-span-1 glass-card border border-slate-800 rounded-3xl p-5 flex flex-col min-h-0 bg-slate-950/20">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center justify-between">
                <span>Active Chat Rooms</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{finalSidebarUsers.length} total</span>
              </h3>

              {/* Search Bar for sidebar users */}
              <div className="relative mb-4">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members to chat..."
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {finalSidebarUsers.map((member) => {
                  const isSelected = selectedPartnerId === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedPartnerId(member.id)}
                      className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-gradient-brand text-white border-transparent shadow-lg scale-[1.01]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={member.profileImage || member.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                          alt={member.fullName || member.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-850"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]"></span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-bold text-xs truncate leading-tight">{member.fullName || member.name}</h4>
                        </div>
                        <p className={`text-[9px] truncate mt-0.5 font-mono ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {member.email}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {finalSidebarUsers.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No active members found matching "{chatSearchTerm}".
                  </div>
                )}
              </div>
            </div>

            {/* Right chat room box container */}
            <div className="lg:col-span-2 flex flex-col h-full min-h-0">
              {selectedPartnerId ? (
                <ChatBox
                  currentUserId={user.id}
                  partner={partnerObject}
                  messages={mappedMessages}
                  onSendMessage={handleSendChatMessage}
                  partnerIsTyping={partnerIsTyping}
                />
              ) : (
                <div className="flex-1 glass-card border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">Real-Time Messaging Room</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-normal">
                    Select a conversation partner from the thread directory column to open an active, secure real-time private chat room.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TABS 3: ADVANCED SEARCH FILTERS */}
        {activeTab === 'filters' && (
          <div className="max-w-2xl mx-auto glass-card border border-slate-800 rounded-3xl p-8 space-y-6">
            <h3 className="font-black text-xl text-white">Dating Recommendation Filters</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tweak interest goals and geolocation ranges to compute refined matching suggestions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Gender Preference</label>
                <select
                  value={filterGender}
                  onChange={(e) => { setFilterGender(e.target.value); setSwipeIdx(0); }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="everyone">Everyone</option>
                  <option value="male">Male Matchers</option>
                  <option value="female">Female Matchers</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Relationship Goal</label>
                <select
                  value={filterGoal}
                  onChange={(e) => { setFilterGoal(e.target.value); setSwipeIdx(0); }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Goals</option>
                  <option value="marriage">Marriage Intent</option>
                  <option value="long-term">Long-Term Dating</option>
                  <option value="short-term">Short-Term Dating</option>
                  <option value="friendship">Friendship</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Max Candidate Age</label>
                <span className="text-xs font-bold text-indigo-400">{filterAge} Years Old</span>
              </div>
              <input
                type="range"
                min="18"
                max="60"
                value={filterAge}
                onChange={(e) => { setFilterAge(Number(e.target.value)); setSwipeIdx(0); }}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* TABS 4: DETAILED PROFILE BUILDER */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left avatar manager preview */}
            <div className="glass-card border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative group">
                <img
                  src={newAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop'}
                  alt="Profile Avatar"
                  className="w-32 h-32 rounded-full object-cover border-2 border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{user.name}</h3>
                <span className="text-[10px] text-slate-400">{user.email}</span>
              </div>

              {/* Verified status box */}
              {user.profile.verification_badge ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-950 border border-green-900/50 text-[10px] font-bold text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Profile Verified</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                  <span>Photo Pending Verification</span>
                </div>
              )}

              {/* Secure Account Details */}
              <div className="w-full text-left bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 space-y-3 mt-2">
                <h4 className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Secure Profile Meta</h4>
                
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Auth Provider</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                    user.profile.provider === 'google' 
                      ? 'bg-blue-950 border border-blue-900 text-blue-400' 
                      : 'bg-indigo-950 border border-indigo-900 text-indigo-400'
                  }`}>
                    {user.profile.provider || 'Email'}
                  </span>
                </div>

                {user.profile.createdAt && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Created At</span>
                    <span className="text-slate-300 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(user.profile.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Access Role</span>
                  <span className="text-gradient font-extrabold uppercase text-[9px] tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Explicit red Logout button inside dashboard page */}
              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/30 border border-red-900/50 hover:border-red-800 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Session</span>
              </button>
            </div>

            {/* Right form settings inputs */}
            <div className="md:col-span-2 glass-card border border-slate-800 rounded-3xl p-8 space-y-6">
              <h3 className="font-bold text-base text-white">Edit Profile Details</h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {saveSuccess && (
                  <div className="p-3 bg-green-950/30 border border-green-900/50 text-green-400 rounded-xl text-xs font-semibold animate-fade-in">
                    ✓ Dating settings saved successfully. Profile completion rating updated!
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">My Bio Description</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white h-24 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Tell other singles about your vibes, plans, and goals..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Relationship Goal</label>
                    <select
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="marriage">Marriage Intent</option>
                      <option value="long-term">Long-Term Dating</option>
                      <option value="short-term">Short-Term Dating</option>
                      <option value="friendship">Friendship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Preference Gender</label>
                    <select
                      value={editPrefGender}
                      onChange={(e) => setEditPrefGender(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="male">Male Matchers</option>
                      <option value="female">Female Matchers</option>
                    </select>
                  </div>
                </div>

                {/* Tag Interests */}
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">My Top Interests</label>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedInterest}
                      onChange={(e) => setSelectedInterest(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select an interest...</option>
                      <option value="Coding">Coding</option>
                      <option value="Cooking">Cooking</option>
                      <option value="Hiking">Hiking</option>
                      <option value="Travel">Travel</option>
                      <option value="Music">Music</option>
                      <option value="Yoga">Yoga</option>
                      <option value="Art">Art</option>
                      <option value="Literature">Literature</option>
                      <option value="Fitness">Fitness</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="px-4 py-2.5 rounded-xl bg-indigo-950 border border-indigo-900 hover:border-indigo-800 text-xs font-bold text-indigo-400 cursor-pointer"
                    >
                      Add Tag
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user.profile.interests.map((interest: string) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                      >
                        <span>{interest}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 font-bold bg-transparent border-0 cursor-pointer p-0"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-pink-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Save Dating Profile
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
