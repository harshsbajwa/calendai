"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  iconClassName,
}) => {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent sidebar toggle if clicked within
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", className)}
        disabled
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full",
            "hover:bg-accent/80 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95",
            className,
          )}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun
              className={cn(
                "h-[1.1rem] w-[1.1rem] transition-transform duration-500 ease-out hover:rotate-[360deg]",
                iconClassName,
              )}
            />
          ) : (
            <Moon
              className={cn(
                "h-[1.1rem] w-[1.1rem] transition-transform duration-500 ease-out hover:rotate-[360deg]",
                iconClassName,
              )}
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Switch to {theme === "dark" ? "Light" : "Dark"} Mode</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
