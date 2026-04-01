import { useEffect, useState } from 'react';
import type { AnalyticsSettings, FocusBudget, Message, SettingsState, Theme } from '@companion/shared';
import { Analytics } from './components/Analytics';
import { AppHeader } from './components/AppHeader';
import { BottomTabBar, type TabName } from './components/BottomTabBar';
import { Chat } from './components/Chat';
import { FocusSettings } from './components/FocusSettings';
import { PageDetails } from './components/PageDetails';
import { Settings } from './components/Settings';
import { Telegram } from './components/Telegram';
import { clearAnalyticsData, exportData, getAnalyticsSettings, getFocusBudgets, saveAnalyticsSettings, saveFocusBudgets } from './lib/analytics-storage';
import { apiClient } from './lib/api';
import { getPageContext } from './lib/chrome';
import { useUserProfile } from './lib/use-user-profile';

type SubView = { name: 'none' } | { name: 'settings' } | { name: 'focusSettings' } | { name: 'pageDetails'; domain: string };

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

const initialMessages: Message[] = [];

const defaultSettings: SettingsState = {
  theme: 'dark',
};

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('analytics');
  const [subView, setSubView] = useState<SubView>({ name: 'none' });
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings>({
    blocklist: [],
    trackingEnabled: true,
    pinnedDomains: [],
    customCategories: {},
    idleTimeoutMs: 120000,
  });
  const [focusBudgets, setFocusBudgets] = useState<FocusBudget[]>([]);
  const profile = useUserProfile();

  useEffect(() => {
    getAnalyticsSettings().then(setAnalyticsSettings);
    getFocusBudgets().then(setFocusBudgets);
  }, []);

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(settings.theme);
    document.body.setAttribute('data-theme', effectiveTheme);
  }, [settings.theme]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      document.body.setAttribute('data-theme', getEffectiveTheme('system'));
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const context = await getPageContext();
      const response = await apiClient.sendMessage({ content, context });
      const assistantMessage: Message = {
        ...response.message,
        timestamp: response.message.timestamp ? new Date(response.message.timestamp) : new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't connect to the server. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setMessages([]);
      setSettings(defaultSettings);
      clearAnalyticsData();
      setSubView({ name: 'none' });
      setActiveTab('analytics');
    }
  };

  const handleClearChatHistory = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([]);
    }
  };

  const handleSaveAnalyticsSettings = async (newSettings: AnalyticsSettings) => {
    setAnalyticsSettings(newSettings);
    await saveAnalyticsSettings(newSettings);
  };

  const handleClearAnalyticsData = () => {
    if (confirm('Clear all analytics data? This cannot be undone.')) {
      clearAnalyticsData();
    }
  };

  const handleSaveFocusBudgets = async (budgets: FocusBudget[]) => {
    setFocusBudgets(budgets);
    await saveFocusBudgets(budgets);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const data = await exportData(format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browsing-analytics.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setSubView({ name: 'none' });
  };

  // Sub-views overlay the main tabs (settings, focus settings, page details)
  if (subView.name === 'focusSettings') {
    return <FocusSettings budgets={focusBudgets} onSave={handleSaveFocusBudgets} onBack={() => setSubView({ name: 'settings' })} />;
  }

  if (subView.name === 'settings') {
    return (
      <Settings
        onBack={() => setSubView({ name: 'none' })}
        onClearData={handleClearData}
        onClearChatHistory={handleClearChatHistory}
        messageCount={messages.length}
        analyticsSettings={analyticsSettings}
        onSaveAnalyticsSettings={handleSaveAnalyticsSettings}
        onClearAnalyticsData={handleClearAnalyticsData}
        onExport={handleExport}
        onOpenFocusSettings={() => setSubView({ name: 'focusSettings' })}
        focusBudgetCount={focusBudgets.length}
      />
    );
  }

  if (subView.name === 'pageDetails') {
    return <PageDetails domain={subView.domain} onBack={() => setSubView({ name: 'none' })} />;
  }

  // Main shell: header + tab content + bottom bar
  return (
    <div className="flex h-full flex-col bg-background">
      <AppHeader profile={profile} onOpenSettings={() => setSubView({ name: 'settings' })} />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'analytics' && <Analytics onSelectDomain={(domain) => setSubView({ name: 'pageDetails', domain })} />}
        {activeTab === 'chat' && <Chat messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />}
        {activeTab === 'telegram' && <Telegram />}
      </div>

      <BottomTabBar active={activeTab} onChange={handleTabChange} />
    </div>
  );
}

export default App;
