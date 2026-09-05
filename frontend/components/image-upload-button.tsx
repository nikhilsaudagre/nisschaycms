'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

interface ImageUploadButtonProps {
  onUploadComplete: (url: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function ImageUploadButton({
  onUploadComplete,
  label = 'Upload Image',
  disabled = false
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setSuccess(false);

    try {
      const res = await apiClient.post<{ url: string }>('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data && res.data.url) {
        onUploadComplete(res.data.url);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to upload image file', err);
      alert('Failed to upload image file. Ensure it is less than 5MB and is a valid image type.');
    } finally {
      setUploading(false);
      // Clear file input value to allow uploading same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={handleButtonClick}
        className="h-10 rounded-xl px-4 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 shadow-xs flex items-center gap-1.5 shrink-0"
      >
        {uploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
            Uploading...
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            {label}
          </>
        )}
      </Button>
    </div>
  );
}
