import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  className
}) {
  const variants = {
    default: 'bg-white border-slate-200',
    teal: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-transparent',
    warning: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent',
    danger: 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent',
    purple: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-transparent',
  };

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (variant !== 'default') return 'text-white/80';
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-500';
    return 'text-slate-500';
  };

  const isColored = variant !== 'default';

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg",
        variants[variant],
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="w-full h-full rounded-full bg-current transform translate-x-8 -translate-y-8" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={cn(
              "text-sm font-medium",
              isColored ? "text-white/80" : "text-slate-500"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-3xl font-bold mt-1 tracking-tight",
              isColored ? "text-white" : "text-slate-900"
            )}>
              {value}
            </p>
          </div>
          {Icon && (
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isColored ? "bg-white/20" : "bg-slate-100"
            )}>
              <Icon className={cn(
                "w-6 h-6",
                isColored ? "text-white" : "text-slate-600"
              )} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          {subtitle && (
            <p className={cn(
              "text-sm",
              isColored ? "text-white/70" : "text-slate-500"
            )}>
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-xs opacity-70">{trendLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}