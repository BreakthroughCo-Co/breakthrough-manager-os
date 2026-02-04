import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeContext';

/**
 * BackButton - Mobile-optimized navigation control
 * 
 * NDIS Compliance: Clear navigation path for audit trail context
 * Minimum 44px touch target for accessibility
 */
export default function BackButton({ to, label = 'Back', className }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant="ghost"
      size="sm"
      className={cn(
        "touch-manipulation select-none",
        "min-h-[44px] min-w-[44px]",
        isDark ? "text-slate-300 hover:text-slate-100" : "text-slate-600 hover:text-slate-900",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}