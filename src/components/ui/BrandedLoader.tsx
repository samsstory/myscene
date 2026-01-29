import SceneLogo from "./SceneLogo";
import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
  className?: string;
  showQuote?: boolean;
  fullScreen?: boolean;
}

const BrandedLoader = ({ className, showQuote = true, fullScreen = false }: BrandedLoaderProps) => {
  const content = (
    <div className={cn("text-center", className)}>
      <div className="animate-pulse mb-6">
        <SceneLogo size="lg" className="text-2xl" />
      </div>
      {showQuote && (
        <p className="text-muted-foreground text-sm italic max-w-xs mx-auto leading-relaxed">
          "Very often a change of self is needed more than a change of scene."
          <span className="block mt-1 text-xs not-italic opacity-70">— Arthur Christopher Benson</span>
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center px-8">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-8">
      {content}
    </div>
  );
};

export default BrandedLoader;
