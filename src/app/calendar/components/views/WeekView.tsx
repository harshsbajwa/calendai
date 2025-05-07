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
  isSameDay,
  differenceInMinutes,
  setHours,
  setMinutes,
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
  timeGutterWidthPixels,
  calculateEventPositionAndHeightForDay,
} from "~/app/calendar/utils/utils";
import type { UserCalendar } from "~/app/calendar/utils/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  daysInWeek: Date[];
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: "day" | "week" | "month") => void;
  onGridClick: (dateTime: Date, target: HTMLElement) => void;
  userCalendars?: UserCalendar[];
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  daysInWeek,
  setCurrentDate,
  setCurrentView,
  onGridClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hours = useMemo(
    () =>
      eachHourOfInterval({
        start: startOfDay(new Date()),
        end: endOfDay(new Date()),
      }),
    [],
  );

  const weekStart = startOfDay(daysInWeek[0]!);
  const weekEnd = endOfDay(daysInWeek[daysInWeek.length - 1]!);
  const visibleEvents = useMemo(
    () =>
      (events ?? []).filter((event) => {
        return (
          isBefore(event.startTime, weekEnd) &&
          isAfter(event.endTime, weekStart)
        );
      }),
    [events, weekStart, weekEnd],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const now = new Date();
    const todayInView = daysInWeek.some((day) => isToday(day));
    let scrollTop: number;
    // If today is in view and the currentDate (overall selected date) is also today, scroll to current time
    if (todayInView && isToday(currentDate)) {
      const currentMinute = getHours(now) * 60 + getMinutes(now);
      scrollTop = Math.max(0, (currentMinute - 30) / 60) * hourHeight; // Scroll to 30 mins before current time
    } else {
      scrollTop = 7 * hourHeight; // Scroll to 7 AM by default
    }
    requestAnimationFrame(() => {
      container.scrollTop = scrollTop;
    });
  }, [daysInWeek, currentDate]); // Rerun when current date or week changes

  const handleHourSlotClick = (
    day: Date,
    hour: Date,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top; // Y position relative to the slot
    const minutesInHour = (clickY / hourHeight) * 60;
    const clickedTime = setMinutes(
      setHours(day, getHours(hour)),
      Math.floor(minutesInHour / 15) * 15,
    ); // Snap to 15-min intervals
    onGridClick(clickedTime, e.currentTarget);
  };

  return (
    <div className="bg-card dark:border-dark-border isolate flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white/5 shadow-2xl ring-1 ring-black/5 dark:bg-white/5">
      {/* Header Row for Days */}
      <div
        className={cn(
          "sticky top-0 z-20 grid flex-shrink-0 grid-cols-[auto_repeat(7,1fr)] border-b-2 shadow-xl",
          "border-border/50 dark:border-dark-border/50",
          "bg-[hsl(var(--background))]/[var(--bg-opacity-light)] dark:bg-[hsl(var(--dark-background))]/[var(--bg-opacity-dark)]",
          "backdrop-blur-intensity-strong transform-gpu",
        )}
      >
        <div
          className={cn(
            "text-muted-foreground dark:text-dark-muted-foreground py-2 text-center text-xs font-medium",
            timeGutterWidthClass,
          )}
        />
        {daysInWeek.map((day) => (
          <div key={day.toISOString()} className="p-1.5 text-center md:p-2">
            <div className="text-muted-foreground text-xs font-medium md:text-sm">
              {format(day, "EEE").toUpperCase()}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={`View day: ${format(day, "MMMM d")}`}
                  onClick={() => {
                    setCurrentDate(day);
                    setCurrentView("day");
                  }}
                  className={cn(
                    "mx-auto mt-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sm font-medium md:h-8 md:w-8 md:text-base",
                    isToday(day)
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-accent/70",
                    !isToday(day) &&
                      isSameDay(day, currentDate) &&
                      "bg-accent text-accent-foreground ring-primary/50 ring-1",
                  )}
                >
                  {format(day, "d")}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{format(day, "MMMM d, yyyy")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>

      {/* Scrollable Grid Content */}
      <div
        ref={containerRef}
        className="custom-scrollbar relative flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div className="relative grid grid-cols-[auto_repeat(7,1fr)]">
          {/* Time Gutter Column */}
          <div
            className={cn(
              "border-border/40 dark:border-dark-border/40 sticky top-0 left-0 z-10 border-r",
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
                {hourIndex !== 0 && (
                  <span className="text-muted-foreground absolute top-0 -translate-x-1 -translate-y-1/2 transform whitespace-nowrap">
                    {format(hour, "h a").toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {daysInWeek.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-border/50 dark:border-dark-border/50 relative border-l",
                dayIndex === 6 && "border-r-0",
              )}
              style={{ minHeight: `${hours.length * hourHeight}px` }}
            >
              {/* Hour Grid Lines & Clickable Slots */}
              {hours.map((hour, hourIndex) => (
                <div
                  key={`${day.toISOString()}-h-${hourIndex}`}
                  className="border-border/30 dark:border-dark-border/30 hover:bg-accent/30 w-full cursor-pointer border-b opacity-70"
                  style={{ height: `${hourHeight}px` }}
                  onClick={(e) => handleHourSlotClick(day, hour, e)}
                  role="button"
                  aria-label={`Create event on ${format(day, "MMM d")} around ${format(hour, "h a")}`}
                >
                  {/* This div is the clickable hour slot */}
                </div>
              ))}

              {/* Render Events for this day */}
              {visibleEvents
                .filter((event) => {
                  // Filter events that are on this specific day column
                  const eventDayStart = startOfDay(day);
                  const eventDayEnd = endOfDay(day);
                  return (
                    isBefore(event.startTime, eventDayEnd) &&
                    isAfter(event.endTime, eventDayStart)
                  );
                })
                .map((event) => {
                  const eventStyle = calculateEventPositionAndHeightForDay(
                    event,
                    day,
                  );
                  const durationMinutes = differenceInMinutes(
                    event.endTime,
                    event.startTime,
                  );
                  return (
                    <Tooltip key={event.id} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          data-calendar-event-id={event.id}
                          className={cn(
                            "group focus-visible:ring-ring focus-visible:ring-offset-background cursor-pointer overflow-hidden rounded p-1.5 text-[11px] text-white shadow-md transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-1 md:text-xs",
                            "hover:shadow-2xl hover:brightness-110",
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
                            <div className="text-left text-[10px] leading-tight opacity-80 group-hover:opacity-90 md:text-[11px]">
                              {`${format(event.startTime, "p")} - ${format(event.endTime, "p")}`}
                            </div>
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
            </div>
          ))}

          {/* Current Time Indicator - spans across all day columns if today is visible */}
          {daysInWeek.some((day) => isToday(day)) && (
            <CurrentTimeIndicator
              hourHeight={hourHeight}
              timeGutterWidthValue={`${timeGutterWidthPixels}px`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
