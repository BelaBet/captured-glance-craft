import { MessageCircle, Compass, Target, User } from "lucide-react";

type Screen = "onboarding" | "chat" | "dashboard" | "progress" | "profile";

interface BottomNavProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { id: Screen; icon: typeof MessageCircle; label: string }[] = [
  { id: "chat", icon: MessageCircle, label: "Conversa" },
  { id: "dashboard", icon: Compass, label: "Jornada" },
  { id: "progress", icon: Target, label: "Metas" },
  { id: "profile", icon: User, label: "Perfil" },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => (
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-card border-t border-border flex justify-around py-4 pb-6 z-50">
    {navItems.map(({ id, icon: Icon, label }) => (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 hover:bg-tertiary ${
          active === id ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon size={24} />
        <span className="text-[11px] font-medium tracking-wide">{label}</span>
      </button>
    ))}
  </div>
);

export default BottomNav;
