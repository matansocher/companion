import { Settings } from 'lucide-react';
import type { UserProfile } from '../lib/use-user-profile';

type AppHeaderProps = {
  profile: UserProfile;
  onOpenSettings: () => void;
};

export function AppHeader({ profile, onOpenSettings }: AppHeaderProps) {
  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{initials}</div>
      <span className="flex-1 text-sm font-medium text-foreground truncate">{profile.name}</span>
      <button onClick={onOpenSettings} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted" aria-label="Settings">
        <Settings className="h-[18px] w-[18px] text-muted-foreground" />
      </button>
    </div>
  );
}
