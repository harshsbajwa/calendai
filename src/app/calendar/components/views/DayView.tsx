"use client";

import React, { useRef, useMemo, useEffect } from "react";
import {
  format,
  getHours,
  getMinutes,
  isToday,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  differenceInMinutes,
} from "date-fns";
import { cn } from "~/lib/utils";
import { MapPin } from "lucide-react";
import CurrentTimeIndicator from "./CurrentTimeIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { CalendarEvent } from "~/app/calendar/utils/utils";
import {
  hourHeight,
  timeGutterWidthClass,
  calculateEventPositionAndHeightForDay,
} from "~/app/calendar/utils/utils";
import type { UserCalendar } from "~/app/calendar/utils/utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  onGridClick: (dateTime: Date, target: HTMLElement) => void;
  userCalendars?: UserCalendar[];
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onGridClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hours = useMemo(
    () =>
      eachHourOfInterval({
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      }),
    [currentDate],
  );

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);
  const visibleEvents = useMemo(
    () =>
      (events ?? []).filter(
        (event) =>
          isBefore(event.startTime, dayEnd) && isAfter(event.endTime, dayStart),
      ),
    [events, dayStart, dayEnd],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const now = new Date();
    let scrollTop: number;
    if (isToday(currentDate)) {
      const currentMinute = getHours(now) * 60 + getMinutes(now);
      scrollTop = Math.max(0, (currentMinute - 30) / 60) * hourHeight;
    } else {
      scrollTop = 7 * hourHeight;
    } // Scroll to 7 AM by default
    requestAnimationFrame(() => {
      container.scrollTop = scrollTop;
    });
  }, [currentDate]);

  const handleHourSlotClick = (
    hour: Date,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesInHour = (clickY / hourHeight) * 60;
    const clickedTime = setMinutes(
      setHours(currentDate, getHours(hour)),
      Math.floor(minutesInHour / 15) * 15,
    ); // Snap to 15-min intervals
    onGridClick(clickedTime, e.currentTarget);
  };

  return (
    <div className="bg-card dark:border-dark-border isolate flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white/5 shadow-2xl ring-1 ring-black/5 dark:bg-white/5">
      <div
        ref={containerRef}
        className="custom-scrollbar relative flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div className="relative grid grid-cols-[auto_1fr]">
          <div
            className={cn(
              // Time Gutter
              "text-muted-foreground dark:text-dark-muted-foreground sticky top-0 left-0 z-10 border-r",
              "border-border/50 dark:border-dark-border/50",
              "bg-[hsl(var(--background))]/[var(--bg-opacity-light)] dark:bg-[hsl(var(--dark-background))]/[var(--bg-opacity-dark)]",
              "transform-gpu backdrop-blur-sm",
              timeGutterWidthClass,
            )}
          >
            {hours.map((hour, hourIndex) => (
              <div
                key={format(hour, "HH")}
                className="relative flex items-start justify-end pr-2 text-right text-xs md:text-sm"
                style={{ height: `${hourHeight}px` }}
              >
                {hourIndex !== 0 && ( // Don't show 12 AM label at the very top
                  <span className="text-muted-foreground absolute top-0 -translate-x-1 -translate-y-1/2 transform whitespace-nowrap">
                    {format(hour, "h a").toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Event Column */}
          <div
            className="border-border/50 dark:border-dark-border/50 relative border-l"
            style={{ minHeight: `${hours.length * hourHeight}px` }}
          >
            {/* Grid lines per hour */}
            {hours.map((hour, hourIndex) => (
              <div
                key={`hour-slot-${hourIndex}`}
                className="border-border/30 dark:border-dark-border/30 hover:bg-accent/30 w-full cursor-pointer border-b opacity-70"
                style={{ height: `${hourHeight}px` }}
                onClick={(e) => handleHourSlotClick(hour, e)}
                role="button"
                aria-label={`Create event around ${format(hour, "h a")}`}
              >
                {/* This div is the clickable hour slot */}
              </div>
            ))}

            {/* Render Events */}
            {visibleEvents.map((event) => {
              const eventStyle = calculateEventPositionAndHeightForDay(
                event,
                currentDate,
              );
              const durationMinutes = differenceInMinutes(
                event.endTime,
                event.startTime,
              );
              return (
                <Tooltip key={event.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      data-calendar-event-id={event.id} // For popover closing logic
                      className={cn(
                        "group focus-visible:ring-ring focus-visible:ring-offset-background cursor-pointer overflow-hidden rounded p-1.5 text-[11px] text-white shadow transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-1 md:text-xs",
                        "hover:shadow-md hover:brightness-110",
                        event.color ?? "bg-primary/90 dark:bg-primary/80",
                      )}
                      style={eventStyle}
                      onClick={(e) => onEventClick(event, e.currentTarget)}
                      aria-label={`View event: ${event.title}`}
                    >
                      <div className="line-clamp-1 text-left leading-tight font-semibold">
                        {event.title}
                      </div>
                      {durationMinutes > 20 && (
                        <div className="text-left text-[10px] leading-tight opacity-80 group-hover:opacity-90 md:text-[11px]">{`${format(event.startTime, "p")} - ${format(event.endTime, "p")}`}</div>
                      )}
                      {event.location &&
                        durationMinutes > 35 &&
                        event.location.length < 25 && (
                          <div className="mt-0.5 line-clamp-1 text-left text-[10px] leading-tight opacity-70 group-hover:opacity-80 md:text-[11px]">
                            <MapPin className="mr-0.5 inline h-2.5 w-2.5 flex-shrink-0" />
                            {event.location}
                          </div>
                        )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-xs">{`${format(event.startTime, "p")} - ${format(event.endTime, "p")}`}</p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {isToday(currentDate) && (
              <CurrentTimeIndicator
                hourHeight={hourHeight}
                timeGutterWidthValue={"0px"}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
