import React, { useState, useEffect } from 'react';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
}

export default function ProgressiveImage({
  src,
  placeholderSrc,
  className = '',
  alt = 'Profile view',
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(
    placeholderSrc || 
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="%230f172a"/><rect width="100" height="125" fill="%231e293b" opacity="0.4" class="animate-pulse"/></svg>'
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!src) return;

    setIsLoading(true);
    
    // Create preloader in-memory element
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Loading shimmer and spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-10 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 animate-pulse" />
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin relative z-20" />
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} w-full h-full object-cover transition-all duration-700 ease-out ${
          isLoading ? 'blur-md scale-102 opacity-50' : 'blur-0 scale-100 opacity-100'
        }`}
        style={{
          imageRendering: 'auto', // Clean edges
        }}
        draggable="false"
        {...props}
      />
    </div>
  );
}
