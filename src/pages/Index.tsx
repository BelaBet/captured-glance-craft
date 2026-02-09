import { useState } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatScreen from "@/components/ChatScreen";
import DashboardScreen from "@/components/DashboardScreen";
import ProgressScreen from "@/components/ProgressScreen";
import ProfileScreen from "@/components/ProfileScreen";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";

type Screen = "onboarding" | "chat" | "dashboard" | "progress" | "profile";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("onboarding");

  const showNav = screen !== "onboarding";

  return (
    <div className="max-w-[430px] mx-auto bg-card min-h-screen relative shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      <ThemeToggle />
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
