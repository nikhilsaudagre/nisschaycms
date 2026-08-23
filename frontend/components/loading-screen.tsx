import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Soft Blue pulse animation for loading */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 opacity-30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
          {/* A plus icon for medical clinic feel */}
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Nisschay CMS</h1>
        <p className="text-sm text-gray-500 font-medium">Securing your clinic space...</p>
      </div>
    </div>
  );
};
