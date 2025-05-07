"use client";

import React, { useState, useMemo, useRef } from "react";
import { format, startOfDay, isAfter, isSameDay } from "date-fns";
import { PanelRightClose, PanelRightOpen, MapPin } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { CalendarEvent } from "~/app/calendar/utils/utils";

interface AgendaPanelProps {
  isExpanded: boolean;
  togglePanel: () => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  className?: string;
}

const AgendaPanel: React.FC<AgendaPanelProps> = ({
  isExpanded,
  togglePanel,
  events,
  onEventClick,
  className,
}) => {
  const agendaEvents = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return events
      .filter(
        (event) =>
          isAfter(event.endTime, new Date()) ||
          isSameDay(event.startTime, todayStart),
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 5);
  }, [events]);

  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!isExpanded) {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      hoverTimeout.current = setTimeout(() => setIsHovering(true), 200);
    }
  };
  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovering(false);
  };

  const handlePanelClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && !isExpanded) {
      togglePanel();
    }
  };

  return (
    <aside
      className={cn(
        "group relative h-full flex-shrink-0 border-l shadow-lg",
        "border-border/30 dark:border-dark-border/30 isolate bg-white/20 ring-1 ring-black/5",
        "rounded-tl-2xl rounded-bl-2xl",
        !isExpanded && isHovering && "z-40 shadow-2xl md:w-20",
        "overflow-hidden",
        "py-1 md:py-2 lg:py-3",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePanelClick}
    >
      {/* This div is always present, padding applies here */}
      <div
        className={cn(
          "custom-scrollbar flex h-full flex-col overflow-y-auto p-3",
          "transition-opacity duration-300 ease-out",
          isExpanded ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Header with Toggle Button */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center",
            isExpanded ? "mb-3 justify-between" : "mb-0 justify-center",
          )}
        >
          {isExpanded && (
            <h2 className="text-foreground ml-1 font-serif text-xl font-semibold">
              Agenda
            </h2>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePanel();
                }}
                aria-label={
                  isExpanded ? "Collapse Agenda Panel" : "Expand Agenda Panel"
                }
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <PanelRightClose className="h-5 w-5" />
                ) : (
                  <PanelRightOpen className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isExpanded ? "bottom" : "left"}>
              <p>{isExpanded ? "Collapse Agenda" : "Expand Agenda"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Scrollable Agenda Content - Hidden when not expanded */}
        {isExpanded && (
          <div
            className={cn(
              "mt-1 flex-grow overflow-hidden",
            )}
          >
            {agendaEvents.length === 0 && (
              <p className="text-muted-foreground text-sm italic">
                No upcoming events.
              </p>
            )}
            <div className="space-y-3">
              {agendaEvents.map((event) => (
                <Tooltip key={event.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      data-calendar-event-id={event.id}
                      className="hover:bg-accent group focus-visible:ring-ring w-full rounded-md p-2 text-left transition-colors focus-visible:ring-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event, e.currentTarget as HTMLElement);
                      }}
                      aria-label={`View event: ${event.title}`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full",
                            event.color ?? "bg-primary",
                          )}
                        />
                        <div>
                          <p className="text-foreground group-hover:text-accent-foreground truncate text-sm font-medium">
                            {event.title}
                          </p>
                          <p className="text-muted-foreground group-hover:text-accent-foreground/80 text-xs">
                            {format(event.startTime, "MMM d, p")} -{" "}
                            {format(event.endTime, "p")}
                          </p>
                          {event.location && (
                            <p className="text-muted-foreground/70 group-hover:text-accent-foreground/70 mt-0.5 truncate text-xs">
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="font-semibold">{event.title}</p>
                    <p>
                      {format(event.startTime, "Pp")} -{" "}
                      {format(event.endTime, "p")}
                    </p>
                    {event.location && (
                      <p className="flex items-center gap-1">
                        <MapPin className="inline-block h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
        {!isExpanded && (
          <div className="flex h-full flex-col items-center justify-center pt-4">
            {" "}
            <PanelRightOpen className="text-muted-foreground/70 h-6 w-6" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default AgendaPanel;
