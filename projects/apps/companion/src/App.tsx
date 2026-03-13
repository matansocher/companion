import { useEffect, useState } from 'react';
import type { AnalyticsSettings, FocusBudget, Message, SettingsState, Theme } from '@companion/shared';
import { Analytics } from './components/Analytics';
import { Chat } from './components/Chat';
import { FocusSettings } from './components/FocusSettings';
import { PageDetails } from './components/PageDetails';
import { Settings } from './components/Settings';
import { clearAnalyticsData, exportData, getAnalyticsSettings, getFocusBudgets, saveAnalyticsSettings, saveFocusBudgets } from './lib/analytics-storage';
import { apiClient } from './lib/api';
import { getPageContext } from './lib/chrome';

type View = { name: 'analytics' } | { name: 'chat' } | { name: 'settings' } | { name: 'pageDetails'; domain: string } | { name: 'focusSettings' };

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

// Initial empty messages - ready for real API communication
const initialMessages: Message[] = [];

const defaultSettings: SettingsState = {
  theme: 'dark',
};

function App() {
  const [view, setView] = useState<View>({ name: 'analytics' });
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

  // Load analytics settings and focus budgets on mount
  useEffect(() => {
    getAnalyticsSettings().then(setAnalyticsSettings);
    getFocusBudgets().then(setFocusBudgets);
  }, []);

  // Apply theme setting
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(settings.theme);
    document.body.setAttribute('data-theme', effectiveTheme);
  }, [settings.theme]);

  // Listen for system theme changes when using "system" theme
  useEffect(() => {
    if (settings.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme('system');
      document.body.setAttribute('data-theme', effectiveTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    console.log('!!!!!!!!!!!!!!!!!!!!!!');
    setIsLoading(true);
    try {
      // Get the current page context (URL, title, content)
      const context = await getPageContext();

      // Send message with page context to the API
      const response = await apiClient.sendMessage({ content, context });

      // Convert timestamp string back to Date if needed
      const assistantMessage: Message = {
        ...response.message,
        timestamp: response.message.timestamp ? new Date(response.message.timestamp) : new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Show error message to user
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
      setView({ name: 'analytics' });
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

  switch (view.name) {
    case 'focusSettings':
      return <FocusSettings budgets={focusBudgets} onSave={handleSaveFocusBudgets} onBack={() => setView({ name: 'settings' })} />;
    case 'settings':
      return (
        <Settings
          onBack={() => setView({ name: 'analytics' })}
          onClearData={handleClearData}
          onClearChatHistory={handleClearChatHistory}
          messageCount={messages.length}
          analyticsSettings={analyticsSettings}
          onSaveAnalyticsSettings={handleSaveAnalyticsSettings}
          onClearAnalyticsData={handleClearAnalyticsData}
          onExport={handleExport}
          onOpenFocusSettings={() => setView({ name: 'focusSettings' })}
          focusBudgetCount={focusBudgets.length}
        />
      );
    case 'chat':
      return (
        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          onOpenSettings={() => setView({ name: 'settings' })}
          onOpenAnalytics={() => setView({ name: 'analytics' })}
          theme={settings.theme}
          onThemeChange={(theme) => setSettings((prev) => ({ ...prev, theme }))}
          isLoading={isLoading}
        />
      );
    case 'pageDetails':
      return <PageDetails domain={view.domain} onBack={() => setView({ name: 'analytics' })} />;
    case 'analytics':
    default:
      return (
        <Analytics
          onOpenChat={() => setView({ name: 'chat' })}
          onOpenSettings={() => setView({ name: 'settings' })}
          onSelectDomain={(domain) => setView({ name: 'pageDetails', domain })}
          theme={settings.theme}
          onThemeChange={(theme) => setSettings((prev) => ({ ...prev, theme }))}
        />
      );
  }
}

export default App;
