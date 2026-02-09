import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => localStorage.getItem("compass-theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("compass-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="fixed top-5 right-5 z-[1000] flex items-center gap-2 bg-tertiary border border-border rounded-full px-4 py-2 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <Sun size={16} className="text-muted-foreground" />
      <div className="w-12 h-[26px] bg-border rounded-full relative transition-colors duration-300">
        <div
          className={`absolute w-5 h-5 bg-primary rounded-full top-[3px] transition-transform duration-300 ${
            dark ? "translate-x-[25px]" : "translate-x-[3px]"
          }`}
        />
      </div>
      <Moon size={16} className="text-muted-foreground" />
    </button>
  );
};

export default ThemeToggle;
