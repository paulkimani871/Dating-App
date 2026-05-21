import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { uploadProfileImage } from '../utils/imageUtils';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  age?: number;
  gender?: string;
  city?: string;
  country?: string;
  bio?: string;
  interests?: string[];
  profileImage: string | null;
  onlineStatus?: boolean;
  relationship_goal?: string;
  relationshipType?: string;
  createdAt: string;
  lastLogin: string;
  role: 'user' | 'admin';
  provider: 'email' | 'google';
  profileCompleted?: number;
  images?: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    age: number,
    gender: string,
    city: string,
    country: string,
    bio: string,
    relationshipGoal: string,
    interests: string[],
    profileImageBlob: Blob,
    onUploadProgress?: (progress: number) => void
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up with Email and Password
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    age: number,
    gender: string,
    city: string,
    country: string,
    bio: string,
    relationshipGoal: string,
    interests: string[],
    profileImageBlob: Blob,
    onUploadProgress?: (progress: number) => void
  ) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Upload profile image to Firebase Storage (slot index 0 is primary)
      let profileUrl = null;
      try {
        profileUrl = await uploadProfileImage(firebaseUser.uid, profileImageBlob, 0, onUploadProgress);
      } catch (uploadError) {
        console.error("Failed to upload profile image during signup:", uploadError);
      }

      const newUserData: UserData = {
        uid: firebaseUser.uid,
        fullName: fullName,
        email: email,
        age: age,
        gender: gender,
        city: city,
        country: country,
        bio: bio,
        relationship_goal: relationshipGoal,
        relationshipType: relationshipGoal,
        interests: interests,
        profileImage: profileUrl,
        onlineStatus: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: email.toLowerCase() === 'admin@dreammatch.com' ? 'admin' : 'user',
        provider: 'email',
        profileCompleted: 100,
        images: profileUrl ? [profileUrl] : [],
      };

      // Save user to Firestore using UID as document ID
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
      // Notice: We let the single onAuthStateChanged listener handle setUserData and setLoading(false)
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Sign in with Email and Password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (signInError: any) {
        // Automatically register the admin account if it does not exist in Firebase Auth yet for perfect UX
        if (email.toLowerCase() === 'admin@dreammatch.com' && 
            (signInError.code === 'auth/user-not-found' || 
             signInError.code === 'auth/invalid-credential' || 
             signInError.code === 'auth/wrong-password')) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUser = userCredential.user;
            
            const adminUserData: UserData = {
              uid: firebaseUser.uid,
              fullName: 'Platform Administrator',
              email: email,
              profileImage: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
              provider: 'email',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              role: 'admin',
              images: ['https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop'],
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), adminUserData);
          } catch (signUpError) {
            throw signInError; // throw original sign in error if creation fails
          }
        } else {
          throw signInError;
        }
      }

      // Fetch/validate user data from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const lastLoginTime = new Date().toISOString();

      if (userDocSnap.exists()) {
        let finalRole = (userDocSnap.data() as UserData).role;
        
        // Force admin role for the admin@dreammatch.com email
        if (email.toLowerCase() === 'admin@dreammatch.com' && finalRole !== 'admin') {
          finalRole = 'admin';
          await updateDoc(userDocRef, { role: 'admin', lastLogin: lastLoginTime });
        } else {
          await updateDoc(userDocRef, { lastLogin: lastLoginTime });
        }
      } else {
        // Fallback document creation
        const fallbackData: UserData = {
          uid: firebaseUser.uid,
          fullName: email.toLowerCase() === 'admin@dreammatch.com' ? 'Platform Administrator' : 'Dating Member',
          email: email,
          profileImage: null,
          provider: 'email',
          createdAt: lastLoginTime,
          lastLogin: lastLoginTime,
          role: email.toLowerCase() === 'admin@dreammatch.com' ? 'admin' : 'user',
          images: [],
        };
        await setDoc(userDocRef, fallbackData);
      }
      // Notice: We let the single onAuthStateChanged listener handle setUserData and setLoading(false)
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const lastLoginTime = new Date().toISOString();

      if (!userDocSnap.exists()) {
        const isNewAdmin = firebaseUser.email?.toLowerCase() === 'admin@dreammatch.com';
        const newUserData: UserData = {
          uid: firebaseUser.uid,
          fullName: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email || '',
          profileImage: firebaseUser.photoURL || null,
          provider: 'google',
          createdAt: lastLoginTime,
          lastLogin: lastLoginTime,
          role: isNewAdmin ? 'admin' : 'user',
          images: firebaseUser.photoURL ? [firebaseUser.photoURL] : [],
        };
        await setDoc(userDocRef, newUserData);
      } else {
        let finalRole = (userDocSnap.data() as UserData).role;
        if (firebaseUser.email?.toLowerCase() === 'admin@dreammatch.com' && finalRole !== 'admin') {
          await updateDoc(userDocRef, { role: 'admin', lastLogin: lastLoginTime });
        } else {
          await updateDoc(userDocRef, { lastLogin: lastLoginTime });
        }
      }
      // Notice: We let the single onAuthStateChanged listener handle setUserData and setLoading(false)
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUserData(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Listen to Auth State changes (Absolute single source of truth)
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous snapshot listener if any
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      setLoading(true);
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // Setup real-time listener
          unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              let data = docSnap.data() as UserData;
              // Force admin role for the admin@dreammatch.com email
              if (currentUser.email?.toLowerCase() === 'admin@dreammatch.com' && data.role !== 'admin') {
                data.role = 'admin';
                await updateDoc(userDocRef, { role: 'admin' });
              }
              setUserData(data);
              setLoading(false);
            } else {
              const lastLoginTime = new Date().toISOString();
              const fallbackData: UserData = {
                uid: currentUser.uid,
                fullName: currentUser.email?.toLowerCase() === 'admin@dreammatch.com' ? 'Platform Administrator' : (currentUser.displayName || 'Dating Member'),
                email: currentUser.email || '',
                profileImage: currentUser.photoURL || null,
                provider: currentUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                createdAt: lastLoginTime,
                lastLogin: lastLoginTime,
                role: currentUser.email?.toLowerCase() === 'admin@dreammatch.com' ? 'admin' : 'user',
                images: currentUser.photoURL ? [currentUser.photoURL] : [],
              };
              await setDoc(userDocRef, fallbackData);
            }
          }, (err) => {
            console.error('Firestore snapshot listener error:', err);
            setLoading(false);
          });
        } catch (err) {
          console.error('Error establishing user snapshot:', err);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const value = {
    user,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
