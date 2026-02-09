import { Compass } from "lucide-react";

const CompassLogo = () => (
  <div className="animate-rotate w-[120px] h-[120px] mx-auto mb-10 relative">
    <div className="w-[120px] h-[120px] border-2 border-accent rounded-full relative">
      <div
        className="w-0.5 h-[50px] absolute top-[10px] left-[59px]"
        style={{
          background: "linear-gradient(to bottom, hsl(var(--primary)), transparent)",
          transformOrigin: "bottom center",
        }}
      />
      <div className="w-3 h-3 bg-primary rounded-full absolute top-[54px] left-[54px]" />
    </div>
  </div>
);

export default CompassLogo;
