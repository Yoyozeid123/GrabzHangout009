import React from "react";
import { cn } from "@/lib/utils";

interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const RetroInput = React.forwardRef<HTMLInputElement, RetroInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-black text-[#00ff00] text-xl p-3",
          "border-2 border-[#00ff00] box-shadow-retro-inset",
          "placeholder-[#005500] focus:bg-[#001100]",
          className
        )}
        {...props}
      />
    );
  }
);

RetroInput.displayName = "RetroInput";
