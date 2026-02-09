import CompassLogo from "./CompassLogo";

interface OnboardingScreenProps {
  onStart: () => void;
}

const steps = [
  { num: 1, title: "Conversas diárias", desc: "5-10 minutos de reflexão guiada por IA" },
  { num: 2, title: "Descubra padrões", desc: "A IA identifica valores e interesses autênticos" },
  { num: 3, title: "Ações concretas", desc: "Receba um passo prático por dia" },
];

const OnboardingScreen = ({ onStart }: OnboardingScreenProps) => (
  <div className="px-8 pt-16 pb-10 text-center min-h-screen flex flex-col justify-between">
    <div className="flex-1 flex flex-col justify-center animate-slide-up">
      <CompassLogo />
      <h1 className="font-serif text-[42px] font-light mb-4 tracking-tight">Compass</h1>
      <p className="text-lg text-muted-foreground font-light mb-12 leading-relaxed">
        Encontre a direção que dá sentido à sua vida
      </p>

      <div className="flex flex-col gap-5 mb-10 text-left">
        {steps.map(({ num, title, desc }) => (
          <div
            key={num}
            className="flex items-start gap-4 p-5 bg-tertiary rounded-2xl transition-transform duration-300 hover:translate-x-1"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0 text-sm">
              {num}
            </div>
            <div>
              <h3 className="text-base font-semibold mb-1 font-sans">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <button
      onClick={onStart}
      className="bg-primary text-primary-foreground border-none py-[18px] px-10 rounded-full text-base font-medium cursor-pointer transition-all duration-300 tracking-wide hover:-translate-y-0.5 hover:shadow-lg w-full"
    >
      Começar jornada
    </button>
  </div>
);

export default OnboardingScreen;
