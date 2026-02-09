import { useMemo } from "react";

const checks = [
  { label: "6+ caracteres", test: (p: string) => p.length >= 6 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /\d/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const levels = [
  { label: "Muito fraca", color: "bg-destructive" },
  { label: "Fraca", color: "bg-orange-500" },
  { label: "Razoável", color: "bg-yellow-500" },
  { label: "Boa", color: "bg-emerald-400" },
  { label: "Forte", color: "bg-emerald-600" },
];

const PasswordStrength = ({ password }: { password: string }) => {
  const passed = useMemo(() => checks.filter((c) => c.test(password)).length, [password]);

  if (!password) return null;

  const level = levels[passed - 1] ?? levels[0];

  return (
    <div className="px-2 space-y-2 animate-slide-up">
      {/* Bar */}
      <div className="flex gap-1">
        {levels.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < passed ? level.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Força: <span className="font-medium text-foreground">{level.label}</span>
      </p>
    </div>
  );
};

export default PasswordStrength;
