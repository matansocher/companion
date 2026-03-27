import { BarChart3, CalendarDays, MessageCircle, MessageSquare, Send, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabName = 'analytics' | 'chat' | 'telegram' | 'whatsapp' | 'geoguesser' | 'calendar';

const tabs: { name: TabName; label: string; icon: typeof BarChart3 }[] = [
  { name: 'analytics', label: 'Usage', icon: BarChart3 },
  { name: 'chat', label: 'Chat', icon: MessageSquare },
  { name: 'telegram', label: 'Telegram', icon: Send },
  { name: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { name: 'geoguesser', label: 'GeoGuesser', icon: MapPin },
  { name: 'calendar', label: 'Calendar', icon: CalendarDays },
];

type BottomTabBarProps = {
  active: TabName;
  onChange: (tab: TabName) => void;
};

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <div className="flex border-t border-border bg-background">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.name;
        return (
          <button
            key={tab.name}
            onClick={() => onChange(tab.name)}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
