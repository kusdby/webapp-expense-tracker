import * as React from 'react';
import { cn } from '@/lib/utils';

export function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <div className={cn('dialog-card', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
      {children}
    </div>
  </div>;
}
