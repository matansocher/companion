import { AlertTriangle, ChevronRight, OctagonX, Pin } from 'lucide-react';
import type { BudgetStatus, DomainSummary } from '@companion/shared';
import { formatDuration } from '../lib/analytics-storage';
import { cn } from '../lib/utils';

const categoryColors: Record<string, string> = {
  'Social Media': 'bg-pink-500/15 text-pink-400',
  Work: 'bg-blue-500/15 text-blue-400',
  News: 'bg-amber-500/15 text-amber-400',
  Entertainment: 'bg-purple-500/15 text-purple-400',
  Shopping: 'bg-green-500/15 text-green-400',
  Development: 'bg-cyan-500/15 text-cyan-400',
  Other: 'bg-muted text-muted-foreground',
};

type DomainListItemProps = {
  summary: DomainSummary;
  isActive?: boolean;
  isPinned?: boolean;
  budgetStatus?: BudgetStatus;
  budgetPercent?: number;
  onClick: () => void;
};

export function DomainListItem({ summary, isActive = false, isPinned = false, budgetStatus = 'ok', budgetPercent = 0, onClick }: DomainListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        budgetStatus === 'exceeded'
          ? 'bg-red-500/8 ring-1 ring-red-500/25'
          : budgetStatus === 'warning'
            ? 'bg-amber-500/8 ring-1 ring-amber-500/25'
            : isActive
              ? 'bg-primary/10 ring-1 ring-primary/30'
              : 'hover:bg-secondary',
      )}
    >
      <div className="relative">
        <img src={`https://www.google.com/s2/favicons?domain=${summary.domain}&sz=32`} alt="" className="h-6 w-6 rounded" loading="lazy" />
        {/* Green live dot */}
        {isActive && budgetStatus === 'ok' && (
          <span className="absolute -right-0 -top-0 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
        {budgetStatus === 'warning' && <AlertTriangle className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-500" />}
        {budgetStatus === 'exceeded' && <OctagonX className="absolute -right-1 -top-1 h-3.5 w-3.5 text-red-500" />}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          {isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground -rotate-45" />}
          <span className="text-sm font-medium text-foreground truncate">{summary.domain}</span>
          {isActive && <span className="shrink-0 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-500">Live</span>}
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[summary.category] || categoryColors.Other}`}>{summary.category}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              isActive && budgetStatus === 'ok' && 'tabular-nums text-green-500 font-medium',
              budgetStatus === 'warning' && 'tabular-nums text-amber-500 font-medium',
              budgetStatus === 'exceeded' && 'tabular-nums text-red-500 font-medium',
            )}
          >
            {formatDuration(summary.totalDuration)}
          </span>
          {' · '}
          {summary.visitCount} visit{summary.visitCount !== 1 ? 's' : ''}
          {budgetStatus !== 'ok' && <span className={cn('tabular-nums', budgetStatus === 'warning' ? 'text-amber-500' : 'text-red-500')}>· {Math.round(budgetPercent * 100)}%</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
