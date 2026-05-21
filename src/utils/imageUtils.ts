import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Modern profile silhouette placeholder SVG with indigo-to-pink gradient ring
export const PREMIUM_PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><rect width="200" height="200" fill="%230f172a"/><defs><linearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"><stop offset="0%25" stop-color="%236366f1"/><stop offset="100%25" stop-color="%23ec4899"/></linearGradient></defs><circle cx="100" cy="100" r="80" stroke="url(%23grad)" stroke-width="4"/><path d="M100 50 C113.8 50 125 61.2 125 75 C125 88.8 113.8 100 100 100 C86.2 100 75 88.8 75 75 C75 61.2 86.2 50 100 50 Z M60 150 C60 125 80 115 100 115 C120 115 140 125 140 150" stroke="url(%23grad)" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`;

/**
 * Validates the minimum resolution of an image file.
 * Returns the natural width and height of the image.
 */
export const validateImageResolution = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to parse image structure for validation'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file buffer'));
    reader.readAsDataURL(file);
  });
};

/**
 * Center-crops, adjusts brightness/contrast, and compresses an image to 4:5 WebP.
 */
export const processImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Target high-resolution 4:5 portrait (Hinge/Bumble-style layout)
        const targetWidth = 1000;
        const targetHeight = 1250;
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize canvas context'));
          return;
        }

        // Center-crop calculations
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (imgRatio > targetRatio) {
          // Image is wider than target ratio
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Image is taller than target ratio
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        // Draw center-cropped image
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

        // Apply premium micro-enhancements (slight brightness + contrast)
        try {
          if ('filter' in ctx) {
            ctx.filter = 'brightness(1.03) contrast(1.02)';
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none'; // reset filter
          }
        } catch (filterError) {
          console.warn('Canvas filter adjustment not supported, skipping enhancement:', filterError);
        }

        // Convert to high-quality lossy WebP (0.88 compression ratio)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP blob generation fails
            canvas.toBlob((jpegBlob) => {
              if (jpegBlob) {
                resolve(jpegBlob);
              } else {
                reject(new Error('Image encoding failed'));
              }
            }, 'image/jpeg', 0.88);
          }
        }, 'image/webp', 0.88);
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image buffer'));
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a processed image blob to Firebase Storage and returns the public download URL.
 * Supports an optional onProgress callback to report upload progress in real-time.
 */
export const uploadProfileImage = async (
  userId: string, 
  blob: Blob, 
  slotIndex: number,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const timestamp = Date.now();
  const fileExtension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `users/${userId}/images/slot_${slotIndex}_${timestamp}.${fileExtension}`;
  
  const storageRef = ref(storage, filePath);
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type,
      cacheControl: 'public,max-age=31536000', // Cache long-term for performance
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};
