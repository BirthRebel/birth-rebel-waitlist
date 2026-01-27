import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionRequiredBannerProps {
  title: string;
  description: string;
  onClick?: () => void;
  variant?: "warning" | "info";
  icon?: React.ReactNode;
}

export const ActionRequiredBanner = ({
  title,
  description,
  onClick,
  variant = "warning",
  icon
}: ActionRequiredBannerProps) => {
  const baseClasses = "rounded-xl p-4 mb-6 border-2 transition-all duration-300";
  const variantClasses = {
    warning: "bg-amber-50 border-amber-400 shadow-lg shadow-amber-500/20",
    info: "bg-blue-50 border-blue-400 shadow-lg shadow-blue-500/20"
  };
  
  const iconColorClasses = {
    warning: "text-amber-600",
    info: "text-blue-600"
  };

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        onClick && "cursor-pointer hover:scale-[1.02] w-full text-left"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-2 rounded-full flex-shrink-0",
          variant === "warning" ? "bg-amber-100" : "bg-blue-100"
        )}>
          {icon || <AlertCircle className={cn("h-6 w-6", iconColorClasses[variant])} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-bold text-lg",
            variant === "warning" ? "text-amber-900" : "text-blue-900"
          )}>
            {title}
          </h3>
          <p className={cn(
            "text-sm mt-1",
            variant === "warning" ? "text-amber-700" : "text-blue-700"
          )}>
            {description}
          </p>
        </div>

        {onClick && (
          <ArrowRight className={cn(
            "h-5 w-5 flex-shrink-0 mt-1",
            iconColorClasses[variant]
          )} />
        )}
      </div>
    </Wrapper>
  );
};
