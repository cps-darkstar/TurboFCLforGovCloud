import React from 'react';

export const PageWrapper = ({ children }) => {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px] p-8">
        {children}
      </div>
    </main>
  );
};