import type { PageVisit, DomainSummary, DomainCategory, TimeRange, AnalyticsSettings, FocusBudget, BudgetStatus } from "@companion/shared"

const VISITS_KEY = "analytics_visits"
const SETTINGS_KEY = "analytics_settings"
const BUDGETS_KEY = "analytics_focus_budgets"

const defaultSettings: AnalyticsSettings = {
  blocklist: [],
  trackingEnabled: true,
  pinnedDomains: [],
  customCategories: {},
  idleTimeoutMs: 120000, // 2 minutes default
}

const DOMAIN_CATEGORY_MAP: Record<string, DomainCategory> = {
  // Social Media
  "facebook.com": "Social Media",
  "twitter.com": "Social Media",
  "x.com": "Social Media",
  "instagram.com": "Social Media",
  "linkedin.com": "Social Media",
  "reddit.com": "Social Media",
  "tiktok.com": "Social Media",
  "snapchat.com": "Social Media",
  "mastodon.social": "Social Media",
  "threads.net": "Social Media",
  "pinterest.com": "Social Media",
  "tumblr.com": "Social Media",
  "discord.com": "Social Media",
  "whatsapp.com": "Social Media",
  "web.whatsapp.com": "Social Media",
  "telegram.org": "Social Media",
  "web.telegram.org": "Social Media",
  "signal.org": "Social Media",
  "bsky.app": "Social Media",
  "quora.com": "Social Media",
  "nextdoor.com": "Social Media",
  "messenger.com": "Social Media",
  "wechat.com": "Social Media",
  // Work
  "docs.google.com": "Work",
  "drive.google.com": "Work",
  "sheets.google.com": "Work",
  "slides.google.com": "Work",
  "notion.so": "Work",
  "slack.com": "Work",
  "teams.microsoft.com": "Work",
  "zoom.us": "Work",
  "asana.com": "Work",
  "trello.com": "Work",
  "jira.atlassian.com": "Work",
  "confluence.atlassian.com": "Work",
  "figma.com": "Work",
  "linear.app": "Work",
  "calendar.google.com": "Work",
  "mail.google.com": "Work",
  "outlook.live.com": "Work",
  "outlook.office.com": "Work",
  "monday.com": "Work",
  "clickup.com": "Work",
  "basecamp.com": "Work",
  "airtable.com": "Work",
  "miro.com": "Work",
  "loom.com": "Work",
  "dropbox.com": "Work",
  "box.com": "Work",
  "onedrive.live.com": "Work",
  "meet.google.com": "Work",
  "webex.com": "Work",
  "canva.com": "Work",
  "grammarly.com": "Work",
  "hubspot.com": "Work",
  "salesforce.com": "Work",
  "zendesk.com": "Work",
  "intercom.com": "Work",
  "1password.com": "Work",
  "lastpass.com": "Work",
  "docusign.com": "Work",
  // News
  "news.ycombinator.com": "News",
  "bbc.com": "News",
  "bbc.co.uk": "News",
  "cnn.com": "News",
  "nytimes.com": "News",
  "theguardian.com": "News",
  "reuters.com": "News",
  "apnews.com": "News",
  "techcrunch.com": "News",
  "theverge.com": "News",
  "arstechnica.com": "News",
  "washingtonpost.com": "News",
  "wsj.com": "News",
  "bloomberg.com": "News",
  "ft.com": "News",
  "economist.com": "News",
  "wired.com": "News",
  "engadget.com": "News",
  "mashable.com": "News",
  "vice.com": "News",
  "vox.com": "News",
  "slate.com": "News",
  "politico.com": "News",
  "nbcnews.com": "News",
  "abcnews.go.com": "News",
  "cbsnews.com": "News",
  "foxnews.com": "News",
  "news.google.com": "News",
  "medium.com": "News",
  "substack.com": "News",
  "9to5mac.com": "News",
  "9to5google.com": "News",
  "macrumors.com": "News",
  "slashdot.org": "News",
  "drudgereport.com": "News",
  "huffpost.com": "News",
  "businessinsider.com": "News",
  // Entertainment
  "youtube.com": "Entertainment",
  "netflix.com": "Entertainment",
  "twitch.tv": "Entertainment",
  "spotify.com": "Entertainment",
  "disneyplus.com": "Entertainment",
  "hulu.com": "Entertainment",
  "soundcloud.com": "Entertainment",
  "music.youtube.com": "Entertainment",
  "music.apple.com": "Entertainment",
  "primevideo.com": "Entertainment",
  "hbomax.com": "Entertainment",
  "max.com": "Entertainment",
  "peacocktv.com": "Entertainment",
  "crunchyroll.com": "Entertainment",
  "funimation.com": "Entertainment",
  "vimeo.com": "Entertainment",
  "dailymotion.com": "Entertainment",
  "tidal.com": "Entertainment",
  "pandora.com": "Entertainment",
  "deezer.com": "Entertainment",
  "imdb.com": "Entertainment",
  "rottentomatoes.com": "Entertainment",
  "letterboxd.com": "Entertainment",
  "9gag.com": "Entertainment",
  "imgur.com": "Entertainment",
  "giphy.com": "Entertainment",
  "kongregate.com": "Entertainment",
  "miniclip.com": "Entertainment",
  "steampowered.com": "Entertainment",
  "store.steampowered.com": "Entertainment",
  "epicgames.com": "Entertainment",
  "gog.com": "Entertainment",
  "twitch.com": "Entertainment",
  "kick.com": "Entertainment",
  // Shopping
  "amazon.com": "Shopping",
  "amazon.co.uk": "Shopping",
  "amazon.de": "Shopping",
  "amazon.ca": "Shopping",
  "ebay.com": "Shopping",
  "etsy.com": "Shopping",
  "walmart.com": "Shopping",
  "target.com": "Shopping",
  "aliexpress.com": "Shopping",
  "bestbuy.com": "Shopping",
  "costco.com": "Shopping",
  "newegg.com": "Shopping",
  "shopify.com": "Shopping",
  "wayfair.com": "Shopping",
  "ikea.com": "Shopping",
  "homedepot.com": "Shopping",
  "lowes.com": "Shopping",
  "zappos.com": "Shopping",
  "nordstrom.com": "Shopping",
  "macys.com": "Shopping",
  "shein.com": "Shopping",
  "temu.com": "Shopping",
  "wish.com": "Shopping",
  "asos.com": "Shopping",
  "zara.com": "Shopping",
  "hm.com": "Shopping",
  "nike.com": "Shopping",
  "adidas.com": "Shopping",
  "alibaba.com": "Shopping",
  "rakuten.com": "Shopping",
  "overstock.com": "Shopping",
  // Development
  "github.com": "Development",
  "gitlab.com": "Development",
  "stackoverflow.com": "Development",
  "npmjs.com": "Development",
  "developer.mozilla.org": "Development",
  "codepen.io": "Development",
  "codesandbox.io": "Development",
  "vercel.com": "Development",
  "netlify.com": "Development",
  "docs.rs": "Development",
  "crates.io": "Development",
  "pypi.org": "Development",
  "bitbucket.org": "Development",
  "dev.to": "Development",
  "hashnode.com": "Development",
  "replit.com": "Development",
  "stackblitz.com": "Development",
  "jsfiddle.net": "Development",
  "heroku.com": "Development",
  "railway.app": "Development",
  "render.com": "Development",
  "supabase.com": "Development",
  "firebase.google.com": "Development",
  "aws.amazon.com": "Development",
  "console.aws.amazon.com": "Development",
  "cloud.google.com": "Development",
  "console.cloud.google.com": "Development",
  "portal.azure.com": "Development",
  "hub.docker.com": "Development",
  "kubernetes.io": "Development",
  "terraform.io": "Development",
  "pkg.go.dev": "Development",
  "rubygems.org": "Development",
  "packagist.org": "Development",
  "nuget.org": "Development",
  "maven.apache.org": "Development",
  "hex.pm": "Development",
  "pub.dev": "Development",
  "anaconda.org": "Development",
  "kaggle.com": "Development",
  "leetcode.com": "Development",
  "hackerrank.com": "Development",
  "codeforces.com": "Development",
  "codewars.com": "Development",
  "exercism.org": "Development",
  "freecodecamp.org": "Development",
  "w3schools.com": "Development",
  "css-tricks.com": "Development",
  "smashingmagazine.com": "Development",
  "digitalocean.com": "Development",
  "sentry.io": "Development",
  "datadog.com": "Development",
  "grafana.com": "Development",
  "postman.com": "Development",
  "swagger.io": "Development",
  "prisma.io": "Development",
  "drizzle.team": "Development",
  "tailwindcss.com": "Development",
  "nextjs.org": "Development",
  "vuejs.org": "Development",
  "react.dev": "Development",
  "angular.io": "Development",
  "svelte.dev": "Development",
  "astro.build": "Development",
  "deno.com": "Development",
  "bun.sh": "Development",
  "nodejs.org": "Development",
  "python.org": "Development",
  "rust-lang.org": "Development",
  "go.dev": "Development",
  "typescriptlang.org": "Development",
}

export function categorizeDomain(domain: string, customCategories: Record<string, DomainCategory> = {}): DomainCategory {
  // Custom overrides take priority
  if (customCategories[domain]) return customCategories[domain]
  const parts = domain.split(".")
  if (parts.length > 2) {
    const root = parts.slice(-2).join(".")
    if (customCategories[root]) return customCategories[root]
  }

  if (DOMAIN_CATEGORY_MAP[domain]) return DOMAIN_CATEGORY_MAP[domain]
  if (parts.length > 2) {
    const root = parts.slice(-2).join(".")
    if (DOMAIN_CATEGORY_MAP[root]) return DOMAIN_CATEGORY_MAP[root]
  }
  return "Other"
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return "< 1s"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getTimeRangeStart(timeRange: TimeRange): number {
  const now = Date.now()
  switch (timeRange) {
    case "today": {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return start.getTime()
    }
    case "7days":
      return now - 7 * 24 * 60 * 60 * 1000
    case "30days":
      return now - 30 * 24 * 60 * 60 * 1000
    case "all":
      return 0
  }
}

export async function getVisits(timeRange: TimeRange): Promise<PageVisit[]> {
  const result = await chrome.storage.local.get(VISITS_KEY)
  const visits: PageVisit[] = result[VISITS_KEY] || []
  const start = getTimeRangeStart(timeRange)
  return visits.filter((v) => v.startTime >= start).sort((a, b) => b.startTime - a.startTime)
}

export async function getDomainSummaries(timeRange: TimeRange, customCategories: Record<string, DomainCategory> = {}): Promise<DomainSummary[]> {
  const visits = await getVisits(timeRange)
  const map = new Map<string, DomainSummary>()

  for (const visit of visits) {
    const existing = map.get(visit.domain)
    if (existing) {
      existing.totalDuration += visit.duration
      existing.visitCount += 1
    } else {
      map.set(visit.domain, {
        domain: visit.domain,
        category: categorizeDomain(visit.domain, customCategories),
        totalDuration: visit.duration,
        visitCount: 1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalDuration - a.totalDuration)
}

export async function getVisitsForDomain(domain: string, timeRange: TimeRange): Promise<PageVisit[]> {
  const visits = await getVisits(timeRange)
  return visits.filter((v) => v.domain === domain)
}

export async function getDailyTotals(days: number): Promise<{ date: string; total: number }[]> {
  const now = new Date()
  const result: { date: string; total: number }[] = []

  const allVisits = await getVisits("all")

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dayStart = date.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    const dayTotal = allVisits
      .filter((v) => v.startTime >= dayStart && v.startTime < dayEnd)
      .reduce((sum, v) => sum + v.duration, 0)

    const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    result.push({ date: label, total: dayTotal })
  }

  return result
}

export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  return result[SETTINGS_KEY] || defaultSettings
}

export async function saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export async function clearAnalyticsData(): Promise<void> {
  await chrome.storage.local.remove([VISITS_KEY, "analytics_active_session"])
}

// Focus budget helpers

export async function getFocusBudgets(): Promise<FocusBudget[]> {
  const result = await chrome.storage.local.get(BUDGETS_KEY)
  return result[BUDGETS_KEY] || []
}

export async function saveFocusBudgets(budgets: FocusBudget[]): Promise<void> {
  await chrome.storage.local.set({ [BUDGETS_KEY]: budgets })
}

const WARNING_THRESHOLD = 0.8 // 80% of budget

export function getBudgetStatus(
  domain: string,
  todayDurationMs: number,
  budgets: FocusBudget[],
): { status: BudgetStatus; budget: FocusBudget | null; usagePercent: number } {
  const budget = budgets.find((b) => domain === b.domain || domain.endsWith("." + b.domain))
  if (!budget) return { status: "ok", budget: null, usagePercent: 0 }

  const usagePercent = todayDurationMs / budget.dailyLimitMs
  if (usagePercent >= 1) return { status: "exceeded", budget, usagePercent }
  if (usagePercent >= WARNING_THRESHOLD) return { status: "warning", budget, usagePercent }
  return { status: "ok", budget, usagePercent }
}

export async function getTodayDomainDurations(): Promise<Map<string, number>> {
  const visits = await getVisits("today")
  const map = new Map<string, number>()
  for (const v of visits) {
    map.set(v.domain, (map.get(v.domain) || 0) + v.duration)
  }
  return map
}

// Insights helpers

export type CategoryBreakdown = {
  category: DomainCategory
  totalDuration: number
  percentage: number
}

export async function getCategoryBreakdown(timeRange: TimeRange, customCategories: Record<string, DomainCategory> = {}): Promise<CategoryBreakdown[]> {
  const summaries = await getDomainSummaries(timeRange, customCategories)
  const map = new Map<DomainCategory, number>()

  for (const s of summaries) {
    map.set(s.category, (map.get(s.category) || 0) + s.totalDuration)
  }

  const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
  if (total === 0) return []

  return Array.from(map.entries())
    .map(([category, totalDuration]) => ({
      category,
      totalDuration,
      percentage: totalDuration / total,
    }))
    .sort((a, b) => b.totalDuration - a.totalDuration)
}

export type HeatmapData = number[][] // [dayOfWeek 0-6][hour 0-23] = total ms

export async function getHeatmapData(timeRange: TimeRange): Promise<HeatmapData> {
  const visits = await getVisits(timeRange)
  // 7 days × 24 hours grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const v of visits) {
    const date = new Date(v.startTime)
    const day = date.getDay() // 0=Sun
    const hour = date.getHours()
    grid[day][hour] += v.duration
  }

  return grid
}

const TAB_COUNTS_KEY = "analytics_tab_counts"

export type TabCountEntry = {
  timestamp: number
  count: number
}

export async function getTabCounts(timeRange: TimeRange): Promise<TabCountEntry[]> {
  const result = await chrome.storage.local.get(TAB_COUNTS_KEY)
  const entries: TabCountEntry[] = result[TAB_COUNTS_KEY] || []
  const start = getTimeRangeStart(timeRange)
  return entries.filter((e) => e.timestamp >= start).sort((a, b) => a.timestamp - b.timestamp)
}

export async function exportData(format: "csv" | "json"): Promise<string> {
  const visits = await getVisits("all")

  if (format === "json") {
    return JSON.stringify(visits, null, 2)
  }

  // CSV
  const header = "id,url,domain,title,startTime,endTime,duration\n"
  const rows = visits
    .map((v) => {
      const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`
      return [
        escapeCsv(v.id),
        escapeCsv(v.url),
        escapeCsv(v.domain),
        escapeCsv(v.title),
        v.startTime,
        v.endTime,
        v.duration,
      ].join(",")
    })
    .join("\n")

  return header + rows
}
