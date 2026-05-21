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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  profileImage: string | null;
  provider: 'email' | 'google';
  createdAt: string;
  lastLogin: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
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
  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const newUserData: UserData = {
        uid: firebaseUser.uid,
        fullName: fullName,
        email: email,
        profileImage: null,
        provider: 'email',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        role: email.toLowerCase() === 'admin@dreammatch.com' ? 'admin' : 'user',
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            let data = userDocSnap.data() as UserData;
            // Force admin role for the admin@dreammatch.com email
            if (currentUser.email?.toLowerCase() === 'admin@dreammatch.com' && data.role !== 'admin') {
              data.role = 'admin';
              await updateDoc(userDocRef, { role: 'admin' });
            }
            setUserData(data);
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
            };
            await setDoc(userDocRef, fallbackData);
            setUserData(fallbackData);
          }
        } catch (err) {
          console.error('Error fetching user data from Firestore:', err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
