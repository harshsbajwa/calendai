"use client";

import React, { useMemo } from "react";
import {
  format,
  isAfter,
  isToday,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import type { CalendarEvent } from "~/app/calendar/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface UpcomingEventsViewProps {
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  numEventsToShow?: number;
}

const UpcomingEventsView: React.FC<UpcomingEventsViewProps> = ({
  onEventClick,
  numEventsToShow = 7,
}) => {
  const today = startOfDay(new Date());
  const sevenDaysLater = endOfDay(addDays(today, 7));

  const { data: rawEvents, isLoading } = api.event.getAllByUser.useQuery(
    { startDate: today, endDate: sevenDaysLater },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  );

  const upcomingEvents = useMemo(() => {
    if (!rawEvents) return [];
    return rawEvents
      .filter((event) => isAfter(event.endTime, new Date()))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, numEventsToShow);
  }, [rawEvents, numEventsToShow]);

  if (isLoading)
    return (
      <p className="text-muted-foreground p-1 text-xs italic">
        Loading upcoming...
      </p>
    );

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return (
      <p className="text-muted-foreground p-1 text-xs italic">
        No upcoming events in the next 7 days.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {upcomingEvents.map((event) => (
        <Tooltip key={event.id}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event, e.currentTarget as HTMLElement); // Pass the button itself as target
              }}
              aria-label={`View details for ${event.title}`}
              className={cn(
                "hover:bg-accent group w-full rounded-md p-1.5 text-left transition-colors",
                "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 flex-shrink-0 rounded-full",
                    event.color ?? "bg-primary",
                  )}
                />
                <p className="text-foreground group-hover:text-accent-foreground truncate text-xs font-medium">
                  {event.title}
                </p>
              </div>
              <p className="text-muted-foreground group-hover:text-accent-foreground/80 pl-4 text-[10px]">
                {isToday(event.startTime)
                  ? ""
                  : `${format(event.startTime, "MMM d")}, `}
                {format(event.startTime, "p")} - {format(event.endTime, "p")}
              </p>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold">{event.title}</p>
            <p className="text-xs">
              {format(event.startTime, "MMM d, p")} -{" "}
              {format(event.endTime, "p")}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
export default UpcomingEventsView;
