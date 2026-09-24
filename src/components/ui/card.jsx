import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return <section className={cn('ui-card', className)} {...props} />;
}
