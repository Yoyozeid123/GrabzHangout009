import React from "react";
import { cn } from "@/lib/utils";

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function RetroButton({ 
  variant = "primary", 
  className, 
  children, 
  ...props 
}: RetroButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 font-bold uppercase tracking-wider text-xl",
        "border-2 border-[#00ff00] transition-none",
        "active:translate-y-[2px] active:translate-x-[2px] active:shadow-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-[#ff6f61] text-black hover:bg-[#ff8a7e] box-shadow-retro-green",
        variant === "secondary" && "bg-black text-[#00ff00] hover:bg-[#002200] box-shadow-retro",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
