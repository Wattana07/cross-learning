import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white',
    bordered: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-card',
  }

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={cn(
        'rounded-xl',
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export function CardHeader({
  title,
  description,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between', className)}
      {...props}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex items-center justify-end gap-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

