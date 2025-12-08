'use client'

import { useEffect, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleButtonProps {
  className?: string;
}

export default function ThemeToggleButton({ className }: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'pointer-events-none fixed right-4 top-2 z-[60] h-10 w-10 rounded-full bg-muted/50 md:right-2 md:top-2',
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <div className={cn('fixed right-4 top-2 z-[60] md:right-2 md:top-2', className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="rounded-full border-border bg-background/80 text-foreground shadow-sm backdrop-blur"
        onClick={() => setTheme(nextTheme)}
      >
        {isDark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </div>
  );
}
