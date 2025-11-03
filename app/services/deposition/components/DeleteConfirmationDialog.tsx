"use client";
import React from 'react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

const DeleteConfirmationDialog = React.memo(function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading = false
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative z-10 glass-float p-8 max-w-md mx-4 rounded-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="apple-title text-xl mb-2">{title}</h3>
          <p className="apple-body text-gray-700">{message}</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="apple-body text-sm text-gray-600 hover:text-gray-800 apple-focus px-6 py-3 rounded-xl hover:bg-white/5 transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="glass-button px-6 py-3 text-sm font-medium rounded-xl text-white apple-focus group hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-red-500/20 border border-red-400/30"
          >
            <span className="group-hover:scale-105 transition-transform duration-300">
              {loading ? 'Deleting...' : 'Delete'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default DeleteConfirmationDialog;

