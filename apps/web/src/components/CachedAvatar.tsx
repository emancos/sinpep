import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

interface CachedAvatarProps {
 src?: string | null;
 alt?: string;
 className?: string;
 iconClassName?: string;
}

export const CachedAvatar: React.FC<CachedAvatarProps> = ({ 
 src, 
 alt = 'Avatar', 
 className = "w-full h-full object-cover",
 iconClassName = "w-3.5 h-3.5 text-blue-400"
}) => {
 const [imgSrc, setImgSrc] = useState<string | null>(null);

 useEffect(() => {
 const actualSrc = getAvatarUrl(src);
 if (!actualSrc) {
 setImgSrc(null);
 return;
 }

 const cacheKey = `avatar-cache-${actualSrc}`;
 const cachedData = localStorage.getItem(cacheKey);

 if (cachedData) {
 // Use cached base64
 setImgSrc(cachedData);
 } else {
 // Fallback immediately to the original URL so the user sees something
 setImgSrc(actualSrc);
 
 // Fetch and cache in background
 fetch(actualSrc)
 .then(response => response.blob())
 .then(blob => {
 const reader = new FileReader();
 reader.onloadend = () => {
 const base64data = reader.result as string;
 try {
 localStorage.setItem(cacheKey, base64data);
 setImgSrc(base64data);
 } catch (e) {
 console.warn('Could not save avatar to localStorage. Quota exceeded?', e);
 }
 };
 reader.readAsDataURL(blob);
 })
 .catch(err => {
 console.error('Failed to cache avatar:', err);
 });
 }
 }, [src]);

 if (!imgSrc) {
 return <UserIcon className={iconClassName} />;
 }

 return <img src={imgSrc} alt={alt} className={className} />;
};
