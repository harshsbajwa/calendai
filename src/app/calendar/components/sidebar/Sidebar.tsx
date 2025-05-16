"use client";

import React, { useState, useRef } from "react";
import { cn } from "~/lib/utils";
import SidebarContent from "./SidebarContent";
import type { CalendarEvent } from "~/app/calendar/utils/utils";
import {
  sidebarCollapsedWidth,
  sidebarExpandedWidth,
} from "~/app/calendar/utils/utils";

interface SidebarProps {
  currentDate: Date;
  setCurrentDate: (date: Date | ((prevDate: Date) => Date)) => void;
  onOpenCreateDialog: () => void;
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  isExpanded: boolean;
  toggleSidebar: () => void;
  className?: string;
  selectedCalendarIds: string[];
  setSelectedCalendarIds: (
    ids: string[] | ((prev: string[]) => string[]),
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className,
  isExpanded,
  toggleSidebar,
  ...props
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!isExpanded) {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      hoverTimeout.current = setTimeout(() => {
        setIsHovering(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovering(false);
  };

  return (
    <aside
      className={cn(
        "group relative hidden h-full flex-shrink-0 flex-col justify-between border-r shadow-lg transition-all duration-300 ease-in-out md:flex",
        "border-white/10 dark:border-black/20",
        "isolate bg-glass-sidebar ring-1 ring-black/5",
        "backdrop-blur-[12px] backdrop-saturate-150",
        "rounded-tr-2xl rounded-br-2xl",
        isExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth,
        !isExpanded && isHovering && "z-40 shadow-2xl md:w-20",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent
        isExpanded={isExpanded}
        toggleSidebar={toggleSidebar}
        {...props}
        className={cn("bg-transparent")} 
      />
    </aside>
  );
};

export default Sidebar;