import React from 'react';
import { Heart, X, Star, ShieldAlert, MapPin, Target } from 'lucide-react';

interface RecommendedUser {
  id: number;
  name: string;
  avatar_url: string;
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
  onFavorite: (userId: number) => void;
  onBlock: (userId: number) => void;
  isFavorited: boolean;
}

export default function SwipeCard({ card, onSwipe, onFavorite, onBlock, isFavorited }: SwipeCardProps) {
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

  return (
    <div className="w-[420px] rounded-3xl glass-card overflow-hidden shadow-2xl border border-slate-800/80 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] flex flex-col relative group swipe-card-enter swipe-card-enter-active">
      {/* Compatibility Badge Circle overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-indigo-500/30">
        <Target className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-slate-300">Match Score:</span>
        <span className="text-xs font-bold text-gradient">{score}%</span>
      </div>

      {/* Avatar Box */}
      <div className="h-96 w-full relative overflow-hidden bg-slate-950 select-none">
        <img
          src={card.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop'}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          draggable="false"
        />
        {/* Shadow overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent"></div>
        
        {/* Name Age Tag Overlay */}
        <div className="absolute bottom-4 left-6 right-6">
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
            className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/40 transition-all duration-300"
            title="Block User"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Action core controls */}
          <div className="flex items-center gap-4">
            {/* Dislike */}
            <button
              onClick={() => onSwipe('dislike', score)}
              className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center shadow-lg"
              title="Pass"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Like */}
            <button
              onClick={() => onSwipe('like', score)}
              className="w-14 h-14 rounded-full bg-gradient-brand text-white hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] pulse-border"
              title="Like Partner"
            >
              <Heart className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Favorite star */}
          <button
            onClick={() => onFavorite(card.id)}
            className={`p-3 rounded-full bg-slate-900 border border-slate-800 transition-all duration-300 ${
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
