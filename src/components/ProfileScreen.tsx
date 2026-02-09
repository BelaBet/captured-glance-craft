import { UserCircle, Settings, Info, ChevronRight } from "lucide-react";

const settingsItems = [
  { title: "Notificações", desc: "Lembretes de conversas diárias" },
  { title: "Privacidade", desc: "Gerencie seus dados" },
  { title: "Horário preferido", desc: "Melhor momento para reflexão" },
  { title: "Exportar histórico", desc: "Baixe suas conversas e insights" },
];

const supportItems = [
  { title: "Central de ajuda", desc: "Dúvidas frequentes" },
  { title: "Fale conosco", desc: "Suporte via email" },
];

const ProfileScreen = () => (
  <div className="animate-fade-in pb-[100px] px-6 pt-10">
    {/* Header */}
    <div className="text-center py-10 border-b border-border mb-8">
      <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-accent to-primary mx-auto mb-5 flex items-center justify-center text-primary-foreground">
        <UserCircle size={50} />
      </div>
      <h2 className="font-serif text-[26px] mb-2">Maria Silva</h2>
      <p className="text-sm text-muted-foreground">No Compass desde 15 Jan 2026</p>
    </div>

    {/* Subscription */}
    <div className="bg-gradient-to-br from-accent to-primary text-primary-foreground p-7 rounded-[20px] mb-8">
      <h3 className="font-serif text-[22px] mb-2">Compass Pro</h3>
      <p className="opacity-90 mb-5">Conversas ilimitadas • Insights avançados • Suporte prioritário</p>
      <button className="w-full bg-card text-primary py-[18px] rounded-full font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        Gerenciar assinatura
      </button>
    </div>

    {/* Settings */}
    <Section icon={<Settings size={20} className="text-primary" />} title="Configurações">
      {settingsItems.map((item) => (
        <SettingItem key={item.title} {...item} />
      ))}
    </Section>

    {/* Support */}
    <Section icon={<Info size={20} className="text-primary" />} title="Suporte">
      {supportItems.map((item) => (
        <SettingItem key={item.title} {...item} />
      ))}
    </Section>
  </div>
);

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

const SettingItem = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex justify-between items-center p-5 bg-tertiary rounded-2xl mb-3 cursor-pointer transition-transform duration-300 hover:translate-x-1">
    <div className="flex-1">
      <div className="font-semibold mb-1 text-[15px] font-sans">{title}</div>
      <div className="text-[13px] text-muted-foreground">{desc}</div>
    </div>
    <ChevronRight size={20} className="text-text-tertiary" />
  </div>
);

export default ProfileScreen;
