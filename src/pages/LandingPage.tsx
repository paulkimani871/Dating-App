import React, { useState } from 'react';
import { Heart, Shield, Sparkles, User, Key, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onLoginSuccess?: (user: any) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration States
  const [name, setName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Quick Credential Helpers
  const handlePreFill = (type: 'user' | 'admin') => {
    if (type === 'admin') {
      setEmail('admin@dreammatch.com');
      setPassword('admin123');
    } else {
      setEmail('alex@dreammatch.com');
      setPassword('user123');
    }
    setError('');
    setMessage('');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await signInWithGoogle();
      setMessage('Successfully logged in with Google! Loading workspace...');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await resetPassword(email);
      setMessage('✓ Reset password link has been sent to your email.');
      setIsForgotPassword(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send reset link. Verify your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isForgotPassword && !password)) {
      setError('Please fill in all required credentials.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        // Real Firebase Sign In
        await signIn(email, password);
        setMessage('Sign in successful! Connecting profile...');
      } else {
        // Real Firebase Sign Up
        if (!name) {
          setError('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, name);
        setMessage('Registration successful! Your compatibility profile is ready.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-6 select-none">
      <div className="w-[1000px] max-w-full rounded-3xl glass-card border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        {/* Decorative Grid Mesh */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Brand Core Promo Half */}
        <div className="md:w-1/2 p-10 bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center pulse-border">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <h1 className="font-extrabold text-xl leading-tight tracking-wider text-white">
              DREAM<span className="text-gradient">MATCH</span>
            </h1>
          </div>

          <div className="space-y-6 my-12">
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Discover True <br />
              <span className="text-gradient font-black">Compatibility.</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Our advanced SaaS compatibility calculations bridge distance, shared interests, and life goals to yield premium relationships.
            </p>

            <div className="space-y-3 pt-4">
              {[
                'Real-Time Private Chat Streams',
                'Advanced Geo-Search & Interest Filtering',
                'Verified Avatars & Photo Moderation Controls',
                'Flexible Stripe/PayPal/M-Pesa VIP Plans'
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-xs text-slate-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-rose-500" />
            <span>Secure Firebase Portal v2.0 Ready</span>
          </div>
        </div>

        {/* Interactive Forms Half */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center relative z-10 bg-slate-950/40 backdrop-blur-lg">
          
          {/* Form Header */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {isForgotPassword 
                ? 'Reset Password' 
                : isLogin 
                  ? 'Sign In to Portal' 
                  : 'Create Dating Profile'}
            </h3>
            <p className="text-xs text-slate-400">
              {isForgotPassword 
                ? 'Enter your email to receive a recovery password link.' 
                : isLogin 
                  ? 'Access secure compatibility networks and private chat logs.' 
                  : 'Join modern compatibility matching boards instantly.'}
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="space-y-4">
            
            {/* Custom Toast/Alerts */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-xs font-semibold flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {message && (
              <div className="p-3 bg-green-950/40 border border-green-900/50 text-green-400 rounded-xl text-xs font-semibold animate-fade-in">
                {message}
              </div>
            )}

            {/* Registration fields */}
            {!isLogin && !isForgotPassword && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-650 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Mercer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Secure Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setMessage('');
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-650 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing Secure Gateway...</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {isForgotPassword 
                        ? 'Request Reset Token' 
                        : isLogin 
                          ? 'Enter Compatibility Hub' 
                          : 'Launch Dating Portfolio'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Social login option */}
          {!isForgotPassword && (
            <div className="space-y-4 mt-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800/80"></div>
                </div>
                <span className="relative px-3 text-[10px] text-slate-500 bg-slate-950 uppercase font-black tracking-wider">or sign in with</span>
              </div>

              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* Form footer toggle */}
          <div className="mt-6 text-center text-xs">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setMessage('');
                }}
                className="text-slate-400 hover:text-white transition-colors font-semibold bg-transparent border-0 cursor-pointer"
              >
                ← Back to Login
              </button>
            ) : (
              <>
                <span className="text-slate-500">
                  {isLogin ? 'New to Dream Match?' : 'Already have an account?'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setMessage('');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline bg-transparent border-0 cursor-pointer transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
