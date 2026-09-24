import * as React from 'react';
import { cn } from '@/lib/utils';

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('ui-input', className)} {...props} />;
});

export function NativeSelect({ className, ...props }) {
  return <select className={cn('ui-input', className)} {...props} />;
}
