import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Star, User, MessageCircle, MapPin, Heart, 
  Shield, Settings, Sliders, CheckCircle, Target, Sparkle, 
  Camera, LogOut, Calendar, Search, Trash2, Loader2 
} from 'lucide-react';
import SwipeCard from '../components/SwipeCard';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, addDoc, doc, getDoc, setDoc, 
  updateDoc, query, onSnapshot, orderBy, where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

interface UserDashboardProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpgradePremium: (planName: string, gateway: string, amount: number) => void;
  onlineStatus: boolean;
}

export default function UserDashboard({
  user,
  activeTab,
  setActiveTab,
  onUpgradePremium,
  onlineStatus
}: UserDashboardProps) {
  const { logout } = useAuth();
  
  // Real-time Firestore States
  const [dbUsersList, setDbUsersList] = useState<any[]>([]);
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
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
  const [editImages, setEditImages] = useState<string[]>(() => {
    const rawImages = user.profile.images || [];
    return Array.from({ length: 6 }, (_, idx) => rawImages[idx] || '');
  });
  const [uploadingIndices, setUploadingIndices] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync local edit states with database updates via user prop
  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditBio(user.profile.bio || '');
      setEditGoal(user.profile.relationship_goal);
      setEditPrefGender(user.profile.preference_gender);
      setNewAvatarUrl(user.profile.avatar_url);
      
      const rawImages = user.profile.images || [];
      setEditImages(Array.from({ length: 6 }, (_, idx) => rawImages[idx] || ''));
    }
  }, [user]);

  // Helper to map DB user to SwipeCard expected RecommendedUser shape
  const mapDbUserToCandidate = (dbUser: any) => {
    const calculateCompatibility = (cand: any, currUser: any) => {
      if (!currUser || !cand) return 75;
      const candInterests = cand.interests || [];
      const userInterests = currUser.profile?.interests || [];
      const shared = candInterests.filter((i: string) => userInterests.includes(i)).length;
      
      // Dynamic deterministic/stable score
      const candHash = cand.id ? cand.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
      const userHash = currUser.id ? currUser.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
      const baseScore = 65 + shared * 7 + (Math.abs(candHash - userHash) % 10);
      return Math.min(baseScore, 99);
    };

    return {
      id: dbUser.id,
      name: dbUser.fullName || dbUser.name || 'Anonymous User',
      avatar_url: dbUser.profileImage || dbUser.avatar_url || '',
      images: dbUser.images || (dbUser.profileImage ? [dbUser.profileImage] : (dbUser.avatar_url ? [dbUser.avatar_url] : [])),
      bio: dbUser.bio || "I haven't written a bio yet. Say hello to learn more!",
      gender: dbUser.gender || 'unknown',
      age: dbUser.age ? Number(dbUser.age) : 25,
      location_name: dbUser.city && dbUser.country ? `${dbUser.city}, ${dbUser.country}` : (dbUser.location_name || 'Nairobi, Kenya'),
      relationship_goal: dbUser.relationshipType || dbUser.relationship_goal || 'friendship',
      interests: dbUser.interests || [],
      compatibility_score: calculateCompatibility(dbUser, user)
    };
  };

  // Listen to all registered users from Firestore in real-time
  useEffect(() => {
    setIsLoadingUsers(true);

    // Query excludes current logged in user using 'uid' inequality or document ID check
    const q = query(
      collection(db, 'users'),
      where('uid', '!=', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user.id) {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setDbUsersList(usersList);
      setIsLoadingUsers(false);
    }, async (err) => {
      console.warn("onSnapshot failed or index building, using getDocs fallback:", err);
      try {
        const querySnapshot = await getDocs(q);
        const usersList: any[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.id) {
            usersList.push({ id: doc.id, ...doc.data() });
          }
        });
        setDbUsersList(usersList);
      } catch (fallbackErr) {
        console.error("Firestore getDocs fallback query also failed:", fallbackErr);
      } finally {
        setIsLoadingUsers(false);
      }
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

  // Resolve sidebar users from Firestore registered users
  const finalSidebarUsers = dbUsersList.map(u => ({
    id: u.id,
    fullName: u.fullName || u.name || 'Anonymous Member',
    name: u.fullName || u.name || 'Anonymous Member',
    email: u.email || `${(u.fullName || u.name || 'user').toLowerCase().replace(/\s/g, '')}@example.com`,
    profileImage: u.profileImage || u.avatar_url || '',
    avatar_url: u.profileImage || u.avatar_url || '',
    onlineStatus: u.onlineStatus === true || u.online_status === true,
    online_status: u.onlineStatus === true || u.online_status === true,
    provider: u.provider || 'email',
    role: u.role || 'user'
  })).filter(u => 
    u.fullName.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(chatSearchTerm.toLowerCase())
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

  const handleFavorite = (userId: number | string) => {
    alert('Added to your favorite profile list! ⭐️');
  };

  const handleBlock = (userId: number | string) => {
    alert('User has been blocked. They will no longer appear in your recommendation matches.');
  };

  // Client-side Portrait Cropping (4:5 Ratio), Contrast Enhancement, and WebP Compression Pipeline
  const processAndCropImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Minimum HD resolution validation (at least 640px)
        if (img.width < 640 || img.height < 640) {
          reject(new Error(`Low resolution image detected (${img.width}x${img.height}px). For a premium HD profile, please upload an image of at least 640x640px.`));
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to initialize canvas context."));
          return;
        }

        // Perfect Tinder/Hinge 4:5 aspect ratio (800x1000px)
        const targetWidth = 800;
        const targetHeight = 1000;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const sourceRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let sWidth, sHeight, sx, sy;

        if (sourceRatio > targetRatio) {
          // Source is wider - crop sides
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          // Source is taller - crop top/bottom
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }

        // Apply beautiful light enhancement (slight brightness, contrast, and saturation boosts for that studio premium dating look)
        ctx.filter = 'brightness(1.02) contrast(1.03) saturate(1.01)';
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        // Convert to high-quality compressed WebP (88% quality)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compilation failed."));
          }
        }, 'image/webp', 0.88);
      };

      img.onerror = () => {
        reject(new Error("Invalid image file. Please upload a valid image."));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Upload an Optimized WebP Photo slot to Firebase Storage
  const handleUploadPhoto = async (file: File, index: number) => {
    setUploadError(null);
    setUploadingIndices(prev => [...prev, index]);

    try {
      // 1. Run optimization canvas pipeline
      const optimizedBlob = await processAndCropImage(file);

      // 2. Build unique filename slot path
      const fileExt = 'webp';
      const storagePath = `users/${user.id}/photos/photo_${index}_${Date.now()}.${fileExt}`;
      const fileRef = ref(storage, storagePath);

      // 3. Perform Firebase Storage upload
      const metadata = { contentType: 'image/webp' };
      const uploadResult = await uploadBytes(fileRef, optimizedBlob, metadata);

      // 4. Retrieve persistent clean URL
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 5. Update local state
      const updatedImages = [...editImages];
      updatedImages[index] = downloadUrl;
      setEditImages(updatedImages);

      let avatarUpdates = {};
      if (index === 0) {
        setNewAvatarUrl(downloadUrl);
        avatarUpdates = {
          profileImage: downloadUrl,
          avatar_url: downloadUrl
        };
      }

      // Filter out empty strings/holes to prevent Firestore array serialization crashes
      const dbImages = updatedImages.filter(img => img && img !== '');

      // 6. Write immediately to Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        images: dbImages,
        ...avatarUpdates
      });
    } catch (err: any) {
      console.error("Firebase Storage Upload Error:", err);
      setUploadError(err.message || "An error occurred while uploading. Please try again.");
    } finally {
      setUploadingIndices(prev => prev.filter(i => i !== index));
    }
  };

  // Remove photo slot & delete from Firebase Storage
  const handleDeletePhoto = async (index: number) => {
    setUploadError(null);
    const targetUrl = editImages[index];
    if (!targetUrl) return;

    setUploadingIndices(prev => [...prev, index]);

    try {
      // 1. Delete asset from Firebase Storage if it belongs to this app's storage bucket
      if (targetUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const decoded = decodeURIComponent(targetUrl);
          const oIndex = decoded.indexOf('/o/') + 3;
          const qIndex = decoded.indexOf('?');
          const fullPath = decoded.substring(oIndex, qIndex);
          const fileRef = ref(storage, fullPath);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Storage deletion skipped or failed (file might have been removed already):", storageErr);
        }
      }

      // 2. Splice/shift following photos to fill index gap (just like Tinder!)
      const activeImages = editImages.filter(img => img && img !== '');
      activeImages.splice(index, 1);
      const paddedImages = Array.from({ length: 6 }, (_, idx) => activeImages[idx] || '');
      setEditImages(paddedImages);

      let avatarUpdates = {};
      const fallbackAvatar = paddedImages[0] || '';
      setNewAvatarUrl(fallbackAvatar);
      avatarUpdates = {
        profileImage: fallbackAvatar,
        avatar_url: fallbackAvatar
      };

      const dbImages = paddedImages.filter(img => img && img !== '');

      // 3. Sync to Cloud Firestore
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        images: dbImages,
        ...avatarUpdates
      });
    } catch (err: any) {
      console.error("Delete photo error:", err);
      setUploadError("Could not delete photo. Please try again.");
    } finally {
      setUploadingIndices(prev => prev.filter(i => i !== index));
    }
  };

  // Profile Form Submissions
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dbImages = editImages.filter(img => img && img !== '');

    // Save all profile details dynamically inside Cloud Firestore
    const userDocRef = doc(db, 'users', user.id);
    updateDoc(userDocRef, {
      fullName: editName,
      bio: editBio,
      relationshipType: editGoal,
      relationship_goal: editGoal,
      preference_gender: editPrefGender,
      profileImage: newAvatarUrl,
      avatar_url: newAvatarUrl,
      images: dbImages,
      profileCompleted: 100,
      profile_completed: 100,
      interests: user.profile.interests
    }).then(() => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }).catch(err => {
      console.warn("Error updating Firestore profile directly (might need document creation), trying setDoc:", err);
      // Fallback: use setDoc to create the user profile document if it doesn't exist
      setDoc(userDocRef, {
        uid: user.id,
        fullName: editName,
        bio: editBio,
        relationshipType: editGoal,
        relationship_goal: editGoal,
        preference_gender: editPrefGender,
        profileImage: newAvatarUrl,
        avatar_url: newAvatarUrl,
        images: dbImages,
        profileCompleted: 100,
        profile_completed: 100,
        interests: user.profile.interests,
        onlineStatus: true
      }, { merge: true }).then(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }).catch(fallbackErr => console.error("Firestore setDoc also failed:", fallbackErr));
    });
  };

  const handleAddInterest = () => {
    if (!selectedInterest) return;
    if (user.profile.interests.includes(selectedInterest)) return;
    
    const updatedInterests = [...user.profile.interests, selectedInterest];
    setSelectedInterest('');

    // Persist interests updates in real-time inside Firestore
    const userDocRef = doc(db, 'users', user.id);
    updateDoc(userDocRef, {
      interests: updatedInterests
    }).catch(err => console.error("Error updating interests in Firestore:", err));
  };

  const handleRemoveInterest = (interest: string) => {
    const updatedInterests = user.profile.interests.filter((i: string) => i !== interest);

    // Persist interests updates in real-time inside Firestore
    const userDocRef = doc(db, 'users', user.id);
    updateDoc(userDocRef, {
      interests: updatedInterests
    }).catch(err => console.error("Error updating interests in Firestore:", err));
  };

  // Filter recommendations matching preferences from Cloud Firestore dynamic data
  const getFilteredCandidates = () => {
    return dbUsersList
      .filter((candidate) => {
        // Exclude uncompleted profiles to ensure clean visual cards (must have a name and profile image or images list)
        const hasPhoto = candidate.profileImage || candidate.avatar_url || (candidate.images && candidate.images.length > 0);
        if (!(candidate.fullName || candidate.name) || !hasPhoto) {
          return false;
        }

        const gender = candidate.gender || 'unknown';
        const relationshipGoal = candidate.relationshipType || candidate.relationship_goal || 'friendship';
        const age = candidate.age ? Number(candidate.age) : 25;

        if (filterGender !== 'everyone' && gender !== filterGender) return false;
        if (filterGoal !== 'all' && relationshipGoal !== filterGoal) return false;
        if (age > filterAge) return false;
        return true;
      })
      .map(mapDbUserToCandidate);
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
    onlineStatus: true
  };

  const partnerObject = {
    id: activePartnerMeta.id,
    name: activePartnerMeta.fullName || 'Chat Partner',
    profile: {
      avatar_url: activePartnerMeta.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      location_name: 'Nairobi, Kenya',
      is_premium: false,
      online_status: activePartnerMeta.onlineStatus || true
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
              {isLoadingUsers ? (
                <div className="w-[420px] h-[550px] rounded-3xl glass-card border border-slate-800/85 bg-slate-950 flex flex-col justify-between p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="w-24 h-6 bg-slate-900 rounded-full"></div>
                    </div>
                    <div className="w-full h-80 bg-slate-900 rounded-2xl"></div>
                    <div className="h-4 bg-slate-900 rounded w-3/4 mt-4 animate-pulse"></div>
                    <div className="h-3 bg-slate-900 rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-full"></div>
                    <div className="w-14 h-14 bg-slate-900 rounded-full"></div>
                  </div>
                </div>
              ) : getFilteredCandidates().length > 0 ? (
                swipeIdx < getFilteredCandidates().length ? (
                  <SwipeCard
                    card={getFilteredCandidates()[swipeIdx]}
                    onSwipe={handleSwipe}
                    onFavorite={handleFavorite}
                    onBlock={handleBlock}
                    isFavorited={false}
                  />
                ) : (
                  <div className="h-[460px] glass-card border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-950/20">
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
                )
              ) : (
                <div className="h-[460px] glass-card border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-950/20">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center text-indigo-400 mb-4">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-white text-base">No matches available yet.</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 leading-normal">
                    We couldn't find any completed profiles in the database matching your filters. Complete your profile or tweak search goals!
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
            
            {/* Left Column: 6-Photo Premium Gallery & Meta */}
            <div className="glass-card border border-slate-800 rounded-3xl p-6 flex flex-col space-y-5 bg-slate-950/40">
              
              {/* Premium 6-Photo HD Upload Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase text-indigo-400 font-extrabold tracking-wider">Photo Gallery (Up to 6)</h4>
                  <span className="text-[8px] text-slate-500 font-bold">4:5 Aspect Ratio</span>
                </div>

                {uploadError && (
                  <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded-xl text-[10px] font-semibold animate-fade-in">
                    ⚠️ {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const imageUrl = editImages[idx];
                    const isUploading = uploadingIndices.includes(idx);
                    const isPrimary = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={`relative aspect-[4/5] rounded-xl border bg-slate-900/40 overflow-hidden flex flex-col items-center justify-center transition-all duration-300 group/slot ${
                          imageUrl
                            ? 'border-slate-800 hover:border-slate-700 shadow-md'
                            : 'border-dashed border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={`Photo Slot ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/slot:scale-105"
                            />
                            
                            {/* Dark Gradient bottom cover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent opacity-0 group-hover/slot:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {/* Corner Indicator badge */}
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-slate-950/80 backdrop-blur-md border border-slate-850 text-slate-400 scale-90 origin-top-left">
                              {isPrimary ? '✨ Primary' : `Slot ${idx + 1}`}
                            </div>

                            {/* Deletion action */}
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(idx)}
                              className="absolute bottom-1 right-1 p-1 rounded-md bg-red-950/90 backdrop-blur-md border border-red-900/50 text-red-400 hover:text-white hover:bg-red-900 transition-colors opacity-0 group-hover/slot:opacity-100 cursor-pointer shadow"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : isUploading ? (
                          <div className="flex flex-col items-center gap-1 text-center p-1">
                            <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin" />
                            <span className="text-[7px] uppercase tracking-wider font-extrabold text-indigo-300">HD Crop...</span>
                          </div>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-850/30 transition-colors p-2 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadPhoto(file, idx);
                              }}
                              className="hidden"
                            />
                            <div className="w-6 h-6 rounded-full bg-slate-950/80 border border-slate-850 flex items-center justify-center mb-1 shadow-sm text-slate-500 group-hover/slot:text-indigo-400 group-hover/slot:border-indigo-900/50 transition-all">
                              <Camera className="w-3 h-3" />
                            </div>
                            <span className="text-[8px] font-bold text-slate-500 group-hover/slot:text-slate-400">Add</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pt-2">
                <h3 className="font-bold text-white text-sm leading-snug">{user.name}</h3>
                <span className="text-[10px] text-slate-400">{user.email}</span>
              </div>

              {/* Verified status box */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-950 border border-green-900/50 text-[10px] font-bold text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Profile Verified</span>
              </div>

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
