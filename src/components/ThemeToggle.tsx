import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Palette } from "lucide-react";

const colorThemes = [
  { id: "zen", label: "Zen", from: "#8B7355", to: "#C4B5A0" },
  { id: "ocean", label: "Ocean", from: "#2C5F7C", to: "#5A8BA8" },
  { id: "forest", label: "Forest", from: "#3D5A42", to: "#6B8E71" },
  { id: "lavender", label: "Lavender", from: "#6B5B95", to: "#9B8BC4" },
  { id: "sunset", label: "Sunset", from: "#C4624D", to: "#E89580" },
  { id: "slate", label: "Slate", from: "#475569", to: "#64748B" },
  { id: "rose", label: "Rose", from: "#BE5A7D", to: "#E089AD" },
  { id: "amber", label: "Amber", from: "#D97706", to: "#F59E0B" },
];

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => localStorage.getItem("compass-theme") === "dark");
  const [color, setColor] = useState(() => localStorage.getItem("compass-color") || "zen");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("compass-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.documentElement.setAttribute("data-color", color);
    localStorage.setItem("compass-color", color);
  }, [color]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full px-4 sm:px-5 z-[1000] flex justify-end gap-2 pointer-events-none"
      ref={pickerRef}
    >
      <button
        onClick={() => setDark(!dark)}
        className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-tertiary border border-border rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Sun size={14} className="text-muted-foreground sm:hidden" />
        <Sun size={16} className="text-muted-foreground hidden sm:block" />
        <div className="w-9 sm:w-12 h-[22px] sm:h-[26px] bg-border rounded-full relative transition-colors duration-300">
          <div
            className={`absolute w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full top-[3px] transition-transform duration-300 ${
              dark ? "translate-x-[19px] sm:translate-x-[25px]" : "translate-x-[3px]"
            }`}
          />
        </div>
        <Moon size={14} className="text-muted-foreground sm:hidden" />
        <Moon size={16} className="text-muted-foreground hidden sm:block" />
      </button>

      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        className="pointer-events-auto flex items-center bg-tertiary border border-border rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Palette size={16} className="text-muted-foreground" />
      </button>

      {pickerOpen && (
        <div className="pointer-events-auto absolute top-12 sm:top-14 right-4 sm:right-5 bg-card border border-border rounded-[20px] p-4 shadow-xl animate-fade-in z-[1001]">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Escolha sua paleta
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {colorThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setColor(t.id);
                  setPickerOpen(false);
                }}
                className={`w-11 h-11 rounded-xl transition-all duration-300 hover:scale-110 border-2 relative ${
                  color === t.id
                    ? "border-foreground shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_4px_hsl(var(--foreground))]"
                    : "border-transparent"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                }}
                title={t.label}
              >
                {color === t.id && (
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg drop-shadow">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
