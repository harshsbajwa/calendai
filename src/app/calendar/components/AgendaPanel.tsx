"use client";

import React, { useMemo } from "react";
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
import { agendaPanelCollapsedWidth } from "~/app/calendar/utils/utils";

const SkeletonPlaceholder: React.FC<{ className?: string; count?: number, height?: string, width?: string }> = ({ className, count = 1, height = 'h-4', width = 'w-full' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md bg-muted/50 dark:bg-muted/30", height, width, className)}
        />
      ))}
    </>
  );
};

interface AgendaPanelProps {
  isExpanded: boolean;
  togglePanel: () => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
  isLoadingEvents?: boolean; 
}

const AgendaPanel: React.FC<AgendaPanelProps> = ({
  isExpanded,
  togglePanel,
  events,
  onEventClick,
  className,
  style,
  isLoadingEvents, 
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
      .slice(0, 15); 
  }, [events]);


  const handlePanelClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && !isExpanded) {
      togglePanel();
    }
  };

  return (
    <aside
      style={style} 
      className={cn(
        "group relative flex-shrink-0 border-l shadow-lg transition-all duration-300 ease-in-out",
        "border-white/10 dark:border-black/20",
        "isolate bg-glass-pane backdrop-blur-[12px] backdrop-saturate-150 ring-1 ring-black/5",
        "rounded-tl-2xl rounded-bl-2xl my-3",
        isExpanded ? "flex-none" : agendaPanelCollapsedWidth, 
        "flex flex-col overflow-hidden",
        className,
      )}
      onClick={handlePanelClick}
    >
      <div
        className={cn(
          "flex flex-shrink-0 items-center p-3",
           isExpanded ? "justify-between" : "justify-center",
        )}
      >
        {isExpanded && (
          <h2 className="text-foreground ml-1 font-serif text-xl font-semibold select-none">
            Agenda
          </h2>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
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

      <div
        className={cn(
          "custom-scrollbar flex-grow overflow-y-auto px-3 pb-3",
          "transition-opacity duration-200 ease-in-out",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none h-0",
        )}
      >
        {isExpanded && (
            <>
                {(isLoadingEvents && (!agendaEvents || agendaEvents.length === 0)) && (
                    <div className="space-y-3">
                        <SkeletonPlaceholder count={5} height="h-12" className="w-full" />
                    </div>
                )}
                {!isLoadingEvents && agendaEvents.length === 0 && (
                <p className="text-muted-foreground text-sm italic">
                    No upcoming events.
                </p>
                )}
                {!isLoadingEvents && agendaEvents.length > 0 && (
                    <div className="space-y-3">
                    {agendaEvents.map((event) => (
                        <Tooltip key={event.id} delayDuration={300}>
                        <TooltipTrigger asChild>
                            <button
                            data-calendar-event-id={event.id}
                            className="hover:bg-accent/30 dark:hover:bg-accent/10 group focus-visible:ring-ring w-full rounded-md p-2 text-left transition-colors focus-visible:ring-1"
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
                        <TooltipContent side="left" className="bg-popover/90 backdrop-blur-sm dark:bg-dark-popover/90">
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
                )}
            </>
        )}
      </div>
    </aside>
  );
};

export default AgendaPanel;