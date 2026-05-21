import React, { useState, useRef } from 'react';
import { 
  Heart, Shield, Sparkles, User, Key, ArrowRight, Check, 
  AlertCircle, Upload, ZoomIn, ChevronLeft, Trash2, Camera 
} from 'lucide-react';
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
  const [signupStep, setSignupStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Photo States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageQualityError, setImageQualityError] = useState<string | null>(null);
  const [imgRatio, setImgRatio] = useState<number>(1.0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Profile Completion States
  const [bio, setBio] = useState('');
  const [relationshipGoal, setRelationshipGoal] = useState('long-term');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AVAILABLE_INTERESTS = [
    'Cooking', 'Travel', 'Art', 'Photography', 'Yoga', 
    'Music', 'Fitness', 'Coding', 'Hiking', 'Literature', 
    'Fashion', 'Gaming', 'Gardening'
  ];

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

  // Sharpness/Blur and Brightness Evaluation Edge Detection Algorithm
  const evaluateImageQuality = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        reject(new Error('Invalid image format. We only support premium JPG, PNG, and WEBP.'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Image size exceeds 5MB limit. Please upload a smaller high-quality file.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Minimum HD resolution validation (at least 640x640 px)
        if (img.width < 640 || img.height < 640) {
          reject(new Error(`Low-resolution image detected (${img.width}x${img.height}px). Minimum is 640x640px for premium HD cards.`));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(); // skip check if browser doesn't support canvas context
          return;
        }

        // Draw image downscaled for edge check
        ctx.drawImage(img, 0, 0, 100, 100);
        const imgData = ctx.getImageData(0, 0, 100, 100);
        const data = imgData.data;

        let totalLuminance = 0;
        let edgeVariance = 0;
        let pixelCount = 0;

        // Compare adjacent pixels grayscale values to measure high frequency edge details
        for (let i = 0; i < data.length - 4; i += 8) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          totalLuminance += gray;
          pixelCount++;

          if (i < data.length - 12) {
            const nextR = data[i + 4];
            const nextG = data[i + 5];
            const nextB = data[i + 6];
            const nextGray = 0.299 * nextR + 0.587 * nextG + 0.114 * nextB;
            edgeVariance += Math.abs(gray - nextGray);
          }
        }

        const avgLuminance = totalLuminance / pixelCount;
        const avgEdgeVariance = edgeVariance / pixelCount;

        // Extremely dark check
        if (avgLuminance < 20) {
          reject(new Error('Selected image is extremely dark. Please upload a bright, well-lit photo.'));
          return;
        }

        // Blurry check
        if (avgEdgeVariance < 3.2) {
          reject(new Error('Out of focus/blurry image detected. Please upload a clear, sharp profile photo.'));
          return;
        }

        resolve();
      };
      
      img.onerror = () => {
        reject(new Error('Failed to read image structure. Ensure it is a valid picture.'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file: File) => {
    setImageQualityError(null);
    try {
      await evaluateImageQuality(file);
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setCropZoom(1.0);
      setPanX(0);
      setPanY(0);
      
      const img = new Image();
      img.onload = () => {
        setImgRatio(img.width / img.height);
      };
      img.src = URL.createObjectURL(file);
    } catch (err: any) {
      setImageQualityError(err.message || 'Image validation failed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Drag and reposition mouse calculation handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imagePreviewUrl) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imagePreviewUrl) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile devices support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imagePreviewUrl) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !imagePreviewUrl) return;
    const touch = e.touches[0];
    setPanX(touch.clientX - dragStart.x);
    setPanY(touch.clientY - dragStart.y);
  };

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  // Generate cropped image Blob at 800x1000 px (4:5 portrait crop aspect ratio)
  const generateCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!selectedFile) {
        reject(new Error('Profile photo is required. Please upload an image to continue.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas rendering context failed'));
          return;
        }

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 800, 1000);

        const containerWidth = 280;
        const containerHeight = 350;
        const containerRatio = containerWidth / containerHeight; // 0.8
        const imageRatio = img.naturalWidth / img.naturalHeight;

        let displayedWidth = containerWidth;
        let displayedHeight = containerHeight;

        if (imageRatio > containerRatio) {
          displayedWidth = containerHeight * imageRatio;
        } else {
          displayedHeight = containerWidth / imageRatio;
        }

        const scaleToCanvas = 800 / containerWidth;

        ctx.save();
        ctx.filter = 'brightness(1.02) contrast(1.03) saturate(1.01)';
        
        ctx.translate(400, 500);
        ctx.scale(cropZoom, cropZoom);
        ctx.translate(panX * scaleToCanvas, panY * scaleToCanvas);

        const drawWidth = displayedWidth * scaleToCanvas;
        const drawHeight = displayedHeight * scaleToCanvas;

        ctx.drawImage(
          img,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );

        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('WebP image encoding failed.'));
        }, 'image/webp', 0.88);
      };

      img.onerror = () => reject(new Error('Failed to load image resource for crop'));
      img.src = URL.createObjectURL(selectedFile);
    });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !age || !city || !country) {
      setError('Please fill in all basic registration credentials.');
      return;
    }
    if (Number(age) < 18) {
      setError('Members must be at least 18 years old to join.');
      return;
    }
    setError('');
    setSignupStep(2);
  };

  const handleStep2Submit = () => {
    if (!selectedFile) {
      setError('Please upload a profile photo to continue.');
      return;
    }
    setError('');
    setSignupStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setUploadProgress(0);

    try {
      const croppedBlob = await generateCroppedBlob();
      await signUp(
        email,
        password,
        name,
        Number(age),
        gender,
        city,
        country,
        bio || "I haven't written a bio yet. Say hello to learn more!",
        relationshipGoal,
        selectedInterests,
        croppedBlob,
        (progress) => setUploadProgress(Math.round(progress))
      );
      setMessage('Registration successful! Launching compatibility board...');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to establish account. Verify credentials.');
      setUploadProgress(0);
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your credentials.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await signIn(email, password);
      setMessage('Accessing compatibility networks...');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const cancelPhotoSelection = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setCropZoom(1.0);
    setPanX(0);
    setPanY(0);
    setImageQualityError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                'Mandatory High-Definition Photo Upload',
                'Real-Time Live Private Chat Streams',
                'Advanced Location & Interest Filters',
                'Premium Hinge/Bumble Style Interface'
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

          {/* Quick login prefill buttons */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Secure Firebase Connection Portal v2.0</span>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => handlePreFill('user')} 
                className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Demo Member
              </button>
              <button 
                type="button" 
                onClick={() => handlePreFill('admin')} 
                className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Demo Admin
              </button>
            </div>
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
                  : `Create Dating Profile`}
            </h3>
            {!isLogin && !isForgotPassword && (
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                      signupStep === step
                        ? 'bg-gradient-brand text-white shadow-md'
                        : signupStep > step
                          ? 'bg-indigo-950 text-indigo-400 border border-indigo-850'
                          : 'bg-slate-900 text-slate-600 border border-slate-850'
                    }`}>
                      {signupStep > step ? <Check className="w-2.5 h-2.5" /> : step}
                    </div>
                    {step < 3 && <div className={`w-6 h-0.5 rounded ${signupStep > step ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>}
                  </div>
                ))}
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-2">
                  {signupStep === 1 ? 'Step 1: Credentials' : signupStep === 2 ? 'Step 2: Profile Photo' : 'Step 3: Lifestyle'}
                </span>
              </div>
            )}
            {isLogin && (
              <p className="text-xs text-slate-400">
                Access secure compatibility networks and private chat logs.
              </p>
            )}
          </div>

          {/* Form Errors and Messages */}
          {error && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-xs font-semibold flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {message && (
            <div className="p-3 mb-4 bg-green-950/40 border border-green-900/50 text-green-400 rounded-xl text-xs font-semibold animate-fade-in">
              {message}
            </div>
          )}

          {/* Forms switcher */}
          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
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
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Send Reset Link
              </button>
            </form>
          ) : isLogin ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Secure Password</label>
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
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? 'Entering Compatibility Hub...' : 'Enter Compatibility Hub'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Multi-step Registration Forms */
            <div>
              {signupStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-4 animate-fade-in">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Age</label>
                      <input
                        type="number"
                        required
                        min="18"
                        max="100"
                        placeholder="24"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-Binary</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">City</label>
                      <input
                        type="text"
                        required
                        placeholder="Nairobi"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Country</label>
                      <input
                        type="text"
                        required
                        placeholder="Kenya"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

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

                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Secure Password</label>
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

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Photo Upload</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {signupStep === 2 && (
                <div className="space-y-5 animate-fade-in flex flex-col items-center">
                  <div className="text-center">
                    <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                      Upload a bright, high-resolution portrait. Real profiles are required to maintain the platform's luxury standards.
                    </p>
                  </div>

                  {imageQualityError && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-[10px] font-semibold animate-shake w-full text-center flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{imageQualityError}</span>
                    </div>
                  )}

                  {/* Drag-and-drop / Image Cropper Frame */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`w-[280px] h-[350px] rounded-2xl border border-dashed overflow-hidden flex flex-col items-center justify-center relative group select-none transition-all duration-200 ${
                      isDragActive 
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    {imagePreviewUrl ? (
                      <div 
                        className="w-full h-full relative cursor-move overflow-hidden"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                      >
                        {/* Interactive Cropper Context */}
                        <img
                          src={imagePreviewUrl}
                          alt="Crop Preview"
                          className="absolute pointer-events-none origin-center max-w-none max-h-none"
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: imgRatio > 0.8 ? 'auto' : '100%',
                            height: imgRatio > 0.8 ? '100%' : 'auto',
                            transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${cropZoom})`,
                            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                          }}
                        />
                        {/* Rounded rectangular Card mask border overlay */}
                        <div className="absolute inset-2 border-2 border-indigo-500/80 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]"></div>
                        
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-850 px-2 py-1 rounded text-[8px] font-black uppercase text-indigo-400 tracking-wider">
                          ✨ 4:5 Portrait Crop
                        </div>
                      </div>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-850/20 transition-all text-center p-6">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="w-12 h-12 rounded-2xl bg-slate-950/80 border border-slate-850 flex items-center justify-center mb-3 shadow-md text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-900/50 transition-all">
                          <Upload className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-extrabold text-white">Drag or Browse Portrait</h4>
                        <span className="text-[9px] text-slate-500 mt-1">PNG, JPG, WEBP • Max 5MB • Min 640x640px</span>
                      </label>
                    )}
                  </div>

                  {/* Zoom Reposition Slider Controls */}
                  {imagePreviewUrl && (
                    <div className="w-full bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                        <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3 text-indigo-400" /> Zoom scale</span>
                        <span>{Math.round(cropZoom * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCropZoom((prev) => Math.max(1.0, parseFloat((prev - 0.1).toFixed(2))))}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer select-none"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.02"
                          value={cropZoom}
                          onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                          className="flex-grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCropZoom((prev) => Math.min(3.0, parseFloat((prev + 0.1).toFixed(2))))}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex justify-between gap-2.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPanX(0);
                            setPanY(0);
                            setCropZoom(1.0);
                          }}
                          className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-350 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                        >
                          Reset Pos
                        </button>
                        <button
                          type="button"
                          onClick={cancelPhotoSelection}
                          className="flex-1 py-2 bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-900/30 text-slate-400 hover:text-red-400 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove File
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-4 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="px-4 py-3 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold transition-all hover:bg-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStep2Submit}
                      disabled={!selectedFile}
                      className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span>Continue to Profile Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 3 && (
                <form onSubmit={handleStep3Submit} className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Bio (Introduce Yourself)</label>
                    <textarea
                      placeholder="Share your interests, hobbies, or what your ideal match looks like..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Relationship Goal</label>
                    <select
                      value={relationshipGoal}
                      onChange={(e) => setRelationshipGoal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="long-term">Long-term Relationship</option>
                      <option value="marriage">Looking for Marriage</option>
                      <option value="casual">Casual Dating</option>
                      <option value="friendship">New Friends & Networking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Select Interests (Select all that apply)</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {AVAILABLE_INTERESTS.map((interest) => {
                        const isSelected = selectedInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => handleInterestToggle(interest)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm'
                                : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800'
                            }`}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      disabled={isLoading}
                      className="px-4 py-3 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold transition-all hover:bg-slate-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex flex-col items-center justify-center relative overflow-hidden cursor-pointer disabled:opacity-85 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center py-1">
                          {/* Animated progress bar background tracker */}
                          {uploadProgress > 0 && (
                            <div 
                              className="absolute inset-y-0 left-0 bg-indigo-600/80 transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          )}
                          <span className="flex items-center gap-2 relative z-10">
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>
                              {uploadProgress < 100 
                                ? `Uploading Photo: ${uploadProgress}%` 
                                : 'Compiling Profile...'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 relative z-10">
                          <span>Launch Dating Portfolio</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Social login option */}
          {isLogin && !isForgotPassword && (
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
                    setSignupStep(1);
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
