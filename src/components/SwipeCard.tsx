import React, { useState } from 'react';
import { Heart, X, Star, ShieldAlert, MapPin, Target, ChevronLeft, ChevronRight } from 'lucide-react';

interface RecommendedUser {
  id: number | string;
  name: string;
  avatar_url: string;
  images?: string[];
  bio: string;
  gender: string;
  age: number;
  location_name: string;
  relationship_goal: string;
  interests: string[];
  compatibility_score: number;
}

interface SwipeCardProps {
  card: RecommendedUser;
  onSwipe: (action: 'like' | 'dislike', score: number) => void;
  onFavorite: (userId: number | string) => void;
  onBlock: (userId: number | string) => void;
  isFavorited: boolean;
}

export default function SwipeCard({ card, onSwipe, onFavorite, onBlock, isFavorited }: SwipeCardProps) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  const getGoalColor = (goal: string = '') => {
    switch (goal.toLowerCase()) {
      case 'marriage': return 'bg-rose-950 text-rose-400 border-rose-900/50';
      case 'long-term': return 'bg-indigo-950 text-indigo-400 border-indigo-900/50';
      case 'short-term': return 'bg-pink-950 text-pink-400 border-pink-900/50';
      case 'friendship': return 'bg-green-950 text-green-400 border-green-900/50';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  // Safe Guard Loading/Missing State
  if (!card) {
    return (
      <div className="w-[420px] h-[550px] rounded-3xl glass-card border border-slate-800/80 flex flex-col items-center justify-center text-center p-8 bg-slate-950">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
          <Heart className="w-5 h-5 animate-pulse" />
        </div>
        <h3 className="font-bold text-white text-sm">No profile data available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
          Calculating match compatibility cards...
        </p>
      </div>
    );
  }

  const score = card.compatibility_score ?? 0;
  const name = card.name ?? 'Anonymous User';
  const age = card.age ?? 'N/A';
  const gender = card.gender ?? 'unknown';
  const relationshipGoal = card.relationship_goal ?? 'friendship';
  const locationName = card.location_name ?? 'Location N/A';
  const bioText = card.bio || "I haven't written a bio yet. Say hello to learn more!";
  const interestTags = card.interests ?? [];

  // Custom Premium Vector Fallback Avatar SVG (sleek gradient background + clean typography outline)
  const premiumPlaceholderSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="50%" stop-color="%23312e81"/><stop offset="100%" stop-color="%23db2777"/></linearGradient></defs><rect width="400" height="500" fill="url(%23g)"/><g fill="%23ffffff" opacity="0.15"><circle cx="200" cy="180" r="70"/><path d="M100 360c0-50 35-85 100-85s100 35 100 85z"/></g><g fill="%23ffffff" opacity="0.85" font-family="system-ui, -apple-system, sans-serif" font-weight="900" text-anchor="middle"><text x="200" y="270" font-size="22" letter-spacing="3">DREAM MATCH</text><text x="200" y="300" font-size="11" font-weight="600" opacity="0.6" letter-spacing="1">PREMIUM DATING AVATAR</text></g></svg>`;

  const profileImages = card.images && card.images.length > 0 
    ? card.images 
    : [card.avatar_url || premiumPlaceholderSvg];

  // Safe index validation
  const safeImgIdx = currentImgIdx < profileImages.length ? currentImgIdx : 0;
  const activeImageUrl = profileImages[safeImgIdx] || premiumPlaceholderSvg;

  return (
    <div className="w-[420px] rounded-3xl glass-card overflow-hidden shadow-2xl border border-slate-800/80 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] flex flex-col relative group swipe-card-enter swipe-card-enter-active">
      {/* Compatibility Badge Circle overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-indigo-500/30 shadow-lg">
        <Target className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-slate-300 animate-fade-in">Match Score:</span>
        <span className="text-xs font-bold text-gradient">{score}%</span>
      </div>

      {/* Avatar Box */}
      <div className="h-[400px] w-full relative overflow-hidden bg-slate-950 select-none group/avatar">
        {/* Indicators for multiple photos */}
        {profileImages.length > 1 && (
          <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
            {profileImages.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIdx(idx);
                }}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 border-none cursor-pointer ${
                  idx === safeImgIdx ? 'bg-indigo-400 shadow-sm' : 'bg-white/30 hover:bg-white/50'
                }`}
                title={`Go to photo ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* High-Resolution HD Cover Image */}
        <img
          src={activeImageUrl}
          alt={`${name} profile view`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          draggable="false"
        />

        {/* Left/Right click navigation overlay */}
        {profileImages.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIdx((prev) => (prev > 0 ? prev - 1 : profileImages.length - 1));
              }}
              className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md"
              title="Previous photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIdx((prev) => (prev < profileImages.length - 1 ? prev + 1 : 0));
              }}
              className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md"
              title="Next photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Shadow overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none"></div>
        
        {/* Name Age Tag Overlay */}
        <div className="absolute bottom-4 left-6 right-6 pointer-events-none">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-black text-white leading-tight tracking-wide">{name}</h2>
            <span className="text-xl font-bold text-slate-300">{age}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-0.5 rounded-full font-medium capitalize">
              {gender}
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getGoalColor(relationshipGoal)}`}>
              🎯 {relationshipGoal.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Box */}
      <div className="p-6 flex-1 flex flex-col justify-between bg-slate-950/30">
        {/* Location & Bio */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>{locationName}</span>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{bioText}"
          </p>

          {/* Interest Tags */}
          <div>
            <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Interests</h4>
            <div className="flex flex-wrap gap-1.5">
              {interestTags.map((tag) => (
                <span key={tag} className="text-[10px] bg-slate-900/60 hover:bg-indigo-950/30 text-indigo-300 hover:text-white border border-slate-800/80 px-2 py-0.5 rounded-lg transition-colors cursor-default">
                  #{tag}
                </span>
              ))}
              {interestTags.length === 0 && (
                <span className="text-[10px] text-slate-500 italic">No interests tagged yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Swipe Button Row */}
        <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-slate-900">
          {/* Block lock */}
          <button
            onClick={() => onBlock(card.id)}
            className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/40 transition-all duration-300 cursor-pointer"
            title="Block User"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Action core controls */}
          <div className="flex items-center gap-4">
            {/* Dislike */}
            <button
              onClick={() => onSwipe('dislike', score)}
              className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center shadow-lg cursor-pointer"
              title="Pass"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Like */}
            <button
              onClick={() => onSwipe('like', score)}
              className="w-14 h-14 rounded-full bg-gradient-brand text-white hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] pulse-border cursor-pointer"
              title="Like Partner"
            >
              <Heart className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Favorite star */}
          <button
            onClick={() => onFavorite(card.id)}
            className={`p-3 rounded-full bg-slate-900 border border-slate-800 transition-all duration-300 cursor-pointer ${
              isFavorited
                ? 'text-amber-400 bg-amber-950/20 border-amber-900/50'
                : 'text-slate-500 hover:text-amber-400 hover:bg-amber-950/20 hover:border-amber-900/40'
            }`}
            title={isFavorited ? 'Remove Favorite' : 'Add to Favorites'}
          >
            <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
