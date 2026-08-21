import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatScreen from "@/components/ChatScreen";
import DashboardScreen from "@/components/DashboardScreen";
import ProgressScreen from "@/components/ProgressScreen";
import ProfileScreen from "@/components/ProfileScreen";
import BottomNav from "@/components/BottomNav";
import AuthPage from "@/pages/AuthPage";

type Screen = "onboarding" | "chat" | "dashboard" | "progress" | "profile";

const Index = () => {
  const { user, loading, isRecovery } = useAuth();
  const [screen, setScreen] = useState<Screen>("onboarding");

  if (loading) {
    return (
      <div className="max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] mx-auto bg-card min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || isRecovery) return <AuthPage defaultView={isRecovery ? "reset" : undefined} />;

  const showNav = screen !== "onboarding";

  return (
    <div className="max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] mx-auto bg-card min-h-screen relative shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      {screen === "onboarding" && <OnboardingScreen onStart={() => setScreen("chat")} />}
      {screen === "chat" && <ChatScreen />}
      {screen === "dashboard" && <DashboardScreen />}
      {screen === "progress" && <ProgressScreen />}
      {screen === "profile" && <ProfileScreen />}
      {showNav && <BottomNav active={screen} onNavigate={setScreen} />}
    </div>
  );
};

export default Index;
