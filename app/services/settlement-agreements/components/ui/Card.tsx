import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}

export default function Card({ children, className = '', glass = true, ...props }: CardProps) {
  return (
    <div className={`${glass ? 'glass' : 'bg-white rounded-3xl shadow-xl border border-blue-100'} p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

