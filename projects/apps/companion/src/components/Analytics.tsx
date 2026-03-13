import { BarChart3, MessageSquare, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsSettings, DomainSummary, FocusBudget, TimeRange } from '@companion/shared';
import type { Theme } from '@companion/shared';
import { categorizeDomain, formatDuration, getAnalyticsSettings, getDailyTotals, getDomainSummaries, getFocusBudgets, getTodayDomainDurations } from '../lib/analytics-storage';
import { useActiveSession } from '../lib/use-active-session';
import { cn } from '../lib/utils';
import { DomainList } from './DomainList';
import { Insights } from './Insights';
import { SettingsDropdown } from './SettingsDropdown';
import { TimeRangeFilter } from './TimeRangeFilter';

type AnalyticsTab = 'overview' | 'insights';

type AnalyticsProps = {
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onSelectDomain: (domain: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export function Analytics({ onOpenChat, onOpenSettings, onSelectDomain, theme, onThemeChange }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [summaries, setSummaries] = useState<DomainSummary[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; total: number }[]>([]);
  const [budgets, setBudgets] = useState<FocusBudget[]>([]);
  const [todayDurations, setTodayDurations] = useState<Map<string, number>>(new Map());
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { session, liveElapsed } = useActiveSession();

  const loadData = useCallback(async () => {
    const settings = await getAnalyticsSettings();
    setAnalyticsSettings(settings);
    const [sums, daily, b, today] = await Promise.all([getDomainSummaries(timeRange, settings.customCategories), getDailyTotals(7), getFocusBudgets(), getTodayDomainDurations()]);
    setSummaries(sums);
    setDailyData(daily);
    setBudgets(b);
    setTodayDurations(today);
  }, [timeRange]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeDomain = session?.domain ?? null;
  const mergedSummaries = mergeLiveSession(summaries, activeDomain, liveElapsed, analyticsSettings?.customCategories);

  const mergedTodayDurations = new Map(todayDurations);
  if (activeDomain && liveElapsed > 0) {
    mergedTodayDurations.set(activeDomain, (mergedTodayDurations.get(activeDomain) || 0) + liveElapsed);
  }

  const pinnedDomains = analyticsSettings?.pinnedDomains ?? [];

  // Sort: pinned first, then by duration
  const sortedSummaries = useMemo(() => {
    const pinned = mergedSummaries.filter((s) => pinnedDomains.includes(s.domain));
    const unpinned = mergedSummaries.filter((s) => !pinnedDomains.includes(s.domain));
    return [...pinned, ...unpinned];
  }, [mergedSummaries, pinnedDomains]);

  // Filter by search
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return sortedSummaries;
    const q = searchQuery.toLowerCase();
    return sortedSummaries.filter((s) => s.domain.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [sortedSummaries, searchQuery]);

  const totalTime = mergedSummaries.reduce((sum, s) => sum + s.totalDuration, 0);
  const totalVisits = mergedSummaries.reduce((sum, s) => sum + s.visitCount, 0);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground">Analytics</h1>
          </div>
          <button onClick={onOpenChat} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted" title="Chat">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </button>
          <SettingsDropdown theme={theme} onThemeChange={onThemeChange} onOpenSettings={onOpenSettings} />
        </div>

        {/* Tab navigation */}
        <div className="flex px-4">
          {(['overview', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors border-b-2 capitalize',
                activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

          {/* Summary stats */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-secondary p-3 text-center">
              <p className="text-lg font-bold text-foreground">{formatDuration(totalTime)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Time</p>
            </div>
            <div className="flex-1 rounded-xl bg-secondary p-3 text-center">
              <p className="text-lg font-bold text-foreground">{totalVisits}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Visits</p>
            </div>
            <div className="flex-1 rounded-xl bg-secondary p-3 text-center">
              <p className="text-lg font-bold text-foreground">{mergedSummaries.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sites</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{searchQuery ? `Results for "${searchQuery}"` : 'Top Sites'}</h3>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search domains or categories..."
                className="w-full rounded-lg bg-secondary pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/50 transition-colors"
              />
            </div>
            <DomainList
              summaries={filteredSummaries}
              activeDomain={activeDomain}
              budgets={budgets}
              todayDurations={mergedTodayDurations}
              pinnedDomains={pinnedDomains}
              onSelectDomain={onSelectDomain}
            />
          </div>
        </div>
      ) : (
        <Insights dailyData={dailyData} />
      )}
    </div>
  );
}

function mergeLiveSession(
  summaries: DomainSummary[],
  activeDomain: string | null,
  liveElapsed: number,
  customCategories?: Record<string, import('@companion/shared').DomainCategory>,
): DomainSummary[] {
  if (!activeDomain || liveElapsed <= 0) return summaries;

  const exists = summaries.some((s) => s.domain === activeDomain);

  if (exists) {
    return summaries.map((s) => (s.domain === activeDomain ? { ...s, totalDuration: s.totalDuration + liveElapsed } : s));
  }

  return [
    {
      domain: activeDomain,
      category: categorizeDomain(activeDomain, customCategories),
      totalDuration: liveElapsed,
      visitCount: 1,
    },
    ...summaries,
  ];
}
