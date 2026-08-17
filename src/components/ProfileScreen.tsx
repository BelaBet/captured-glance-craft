import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, Settings, Info, ChevronRight, LogOut, Camera, Pencil, Check, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

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

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
    preferred_time: string | null;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, preferred_time")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setEditName(data.full_name);
        }
      });
  }, [user]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const avatarUrl = profile?.avatar_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", user.id);
    if (updateError) {
      toast({ title: "Erro ao salvar", description: updateError.message, variant: "destructive" });
    } else {
      setProfile((p) => p ? { ...p, avatar_url: path } : p);
      toast({ title: "Foto atualizada!" });
    }
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    const { error } = await supabase.from("profiles").update({ full_name: editName.trim() }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setProfile((p) => p ? { ...p, full_name: editName.trim() } : p);
      setEditing(false);
      toast({ title: "Nome atualizado!" });
    }
  };

  return (
    <div className="animate-fade-in pb-[110px] px-4 sm:px-6 pt-[68px] sm:pt-[76px]">
      <div className="text-center py-8 sm:py-10 border-b border-border mb-8">
        {/* Avatar */}
        <div className="relative w-20 h-20 sm:w-[100px] sm:h-[100px] mx-auto mb-5">
          <Avatar className="w-full h-full text-2xl">

            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-primary-foreground text-2xl font-serif">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          >
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Name */}
        {editing ? (
          <div className="flex items-center justify-center gap-2 mb-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-serif text-[22px] bg-transparent border-b-2 border-primary text-center outline-none w-48"
              autoFocus
            />
            <button onClick={handleSaveName} className="text-primary hover:scale-110 transition-transform">
              <Check size={20} />
            </button>
            <button onClick={() => { setEditing(false); setEditName(displayName); }} className="text-muted-foreground hover:scale-110 transition-transform">
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="font-serif text-[22px] sm:text-[26px] break-words max-w-[240px] sm:max-w-none">{displayName}</h2>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors">
              <Pencil size={16} />
            </button>
          </div>
        )}

        <p className="text-sm text-muted-foreground break-all px-2">{user?.email}</p>
        <p className="text-xs text-muted-foreground mt-1">No Compass desde {joinDate}</p>
      </div>

      <div className="bg-gradient-to-br from-accent to-primary text-primary-foreground p-5 sm:p-7 rounded-[20px] mb-8">
        <h3 className="font-serif text-xl sm:text-[22px] mb-2">Compass Pro</h3>
        <p className="opacity-90 mb-5 text-sm sm:text-base">Conversas ilimitadas • Insights avançados • Suporte prioritário</p>
        <button className="w-full bg-card text-primary py-4 sm:py-[18px] rounded-full font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          Gerenciar assinatura
        </button>

      </div>

      <Section icon={<Settings size={20} className="text-primary" />} title="Configurações">
        {settingsItems.map((item) => (
          <SettingItem key={item.title} {...item} />
        ))}
      </Section>

      <Section icon={<Info size={20} className="text-primary" />} title="Suporte">
        {supportItems.map((item) => (
          <SettingItem key={item.title} {...item} />
        ))}
      </Section>

      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-4 text-destructive font-medium rounded-2xl bg-tertiary hover:bg-destructive/10 transition-all duration-300"
      >
        <LogOut size={18} />
        Sair da conta
      </button>
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">{icon}{title}</h3>
    {children}
  </div>
);

const SettingItem = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex justify-between items-center gap-3 p-4 sm:p-5 bg-tertiary rounded-2xl mb-3 cursor-pointer transition-transform duration-300 hover:translate-x-1">
    <div className="flex-1 min-w-0">
      <div className="font-semibold mb-1 text-sm sm:text-[15px] font-sans">{title}</div>
      <div className="text-xs sm:text-[13px] text-muted-foreground">{desc}</div>
    </div>

    <ChevronRight size={20} className="text-text-tertiary" />
  </div>
);

export default ProfileScreen;
