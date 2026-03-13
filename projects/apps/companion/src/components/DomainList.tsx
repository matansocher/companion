import { Globe } from 'lucide-react';
import type { DomainSummary, FocusBudget } from '@companion/shared';
import { getBudgetStatus } from '../lib/analytics-storage';
import { DomainListItem } from './DomainListItem';

type DomainListProps = {
  summaries: DomainSummary[];
  activeDomain: string | null;
  budgets: FocusBudget[];
  todayDurations: Map<string, number>;
  pinnedDomains: string[];
  onSelectDomain: (domain: string) => void;
};

export function DomainList({ summaries, activeDomain, budgets, todayDurations, pinnedDomains, onSelectDomain }: DomainListProps) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Globe className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No browsing data yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Visit some sites and check back here</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {summaries.map((summary) => {
        const todayMs = todayDurations.get(summary.domain) || 0;
        const { status, usagePercent } = getBudgetStatus(summary.domain, todayMs, budgets);
        return (
          <DomainListItem
            key={summary.domain}
            summary={summary}
            isActive={summary.domain === activeDomain}
            isPinned={pinnedDomains.includes(summary.domain)}
            budgetStatus={status}
            budgetPercent={usagePercent}
            onClick={() => onSelectDomain(summary.domain)}
          />
        );
      })}
    </div>
  );
}
