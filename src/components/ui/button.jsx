import * as React from 'react';
import { cn } from '@/lib/utils';

export function Button({ variant = 'default', size = 'default', className, ...props }) {
  return <button className={cn('ui-button', `ui-button-${variant}`, `ui-button-${size}`, className)} {...props} />;
}
