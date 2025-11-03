"use client";
import React, { useEffect, useRef, ReactNode } from 'react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  children: ReactNode;
  title: string;
}

export const MobileDrawer = React.memo(({ 
  isOpen, 
  onClose, 
  side, 
  children, 
  title 
}: MobileDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when drawer is open and scroll content to top
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Lock body scroll - use both overflow and position for better mobile support
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Scroll drawer content to top
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      // Focus close button after render
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
      
      return () => {
        // Unlock body scroll
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    } else {
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const slideClass = side === 'left' 
    ? 'translate-x-0' 
    : 'translate-x-0';
  
  const hiddenClass = side === 'left'
    ? '-translate-x-full'
    : 'translate-x-full';

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`drawer-title-${side}`}
        className={`fixed ${side === 'left' ? 'left-0' : 'right-0'} 
          top-0 h-screen
          w-[85vw] sm:w-[70vw] md:w-[50vw] lg:w-[40vw] xl:w-[35vw] glass-float z-[101] 
          transform transition-transform duration-300 ease-out
          ${isOpen ? slideClass : hiddenClass}
          flex flex-col`}
        style={{ maxHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 flex-shrink-0">
          <h2 
            id={`drawer-title-${side}`}
            className="apple-subtitle text-base md:text-lg"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-800 hover:text-gray-900 transition-colors p-1.5 md:p-2 rounded-lg hover:bg-white/10 apple-focus"
            aria-label="Close drawer"
          >
            <svg 
              className="w-5 h-5 md:w-6 md:h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable on all devices */}
        <div 
          ref={contentRef} 
          className="flex-1 overflow-y-scroll overflow-x-hidden p-3 md:p-4 overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            minHeight: 0
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
});

MobileDrawer.displayName = 'MobileDrawer';

