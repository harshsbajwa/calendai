"use client";

import React, { useMemo } from "react";
import {
  format,
  isToday,
  startOfDay,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  addDays,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { cn } from "~/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { CalendarEvent } from "~/app/calendar/utils/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: "day" | "week" | "month") => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  setCurrentDate,
  setCurrentView,
}) => {
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const calendarStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((event) => {
      const loopStart = startOfDay(event.startTime);
      const loopEnd = startOfDay(event.endTime);

      eachDayOfInterval({ start: loopStart, end: loopEnd }).forEach(
        (dayInInterval) => {
          if (
            isAfter(dayInInterval, addDays(calendarStart, -1)) &&
            isBefore(dayInInterval, addDays(calendarEnd, 1))
          ) {
            const dayKey = format(dayInInterval, "yyyy-MM-dd");
            const existing = map.get(dayKey) ?? [];
            if (!existing.some((e) => e.id === event.id)) {
              map.set(
                dayKey,
                [...existing, event].sort(
                  (a, b) => a.startTime.getTime() - b.startTime.getTime(),
                ),
              );
            }
          }
        },
      );
    });
    return map;
  }, [events, calendarStart, calendarEnd]);

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setCurrentView("day");
  };

  return (
    <div
      className={cn(
        "isolate flex h-full flex-col overflow-hidden rounded-xl border-2 shadow-2xl ring-1 ring-black/5",
        "border-white/20 dark:border-white/10",
        "bg-glass-pane",
        "backdrop-blur-[12px] backdrop-saturate-150",
      )}
    >
      <div
        className={cn(
          "grid flex-shrink-0 grid-cols-7 border-b py-2.5",
          "border-border/30 dark:border-dark-border/20",
          "bg-transparent backdrop-blur-[var(--blur-intensity-strong)]",
          "transform-gpu",
        )}
      >
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div
            key={day}
            className="text-muted-foreground dark:text-dark-muted-foreground text-center text-xs font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="custom-scrollbar bg-border/50 dark:bg-dark-border/30 grid flex-1 [grid-auto-rows:minmax(1fr,auto)] grid-cols-7 gap-px overflow-y-auto">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const maxEventsToShow = 3;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "group relative flex min-h-[90px] cursor-pointer flex-col p-1.5 transition-colors duration-150",
                isCurrentMonth
                  ? "bg-card/10 dark:bg-dark-card/10"
                  : "bg-card/5 dark:bg-dark-card/5",
                "hover:bg-accent/20 dark:hover:bg-dark-accent/10 hover:shadow-inner",
                !isCurrentMonth &&
                  "text-muted-foreground/70 dark:text-dark-muted-foreground/70",
                "backdrop-blur-sm backdrop-filter",
              )}
              onClick={() => handleDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleDayClick(day);
              }}
              role="button"
              tabIndex={0}
              aria-label={`View events for ${format(day, "MMMM d, yyyy")}${dayEvents.length > 0 ? `, ${dayEvents.length} event(s)` : ""}`}
            >
              <time
                dateTime={format(day, "yyyy-MM-dd")}
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center self-end rounded-full text-xs font-medium transition-colors md:h-7 md:w-7 md:text-sm",
                  "group-hover:bg-primary/20 dark:group-hover:bg-dark-primary/20",
                  isToday(day) &&
                    isCurrentMonth &&
                    "bg-primary text-primary-foreground group-hover:bg-primary/80 font-semibold",
                  !isToday(day) &&
                    isSameDay(day, currentDate) &&
                    isCurrentMonth &&
                    "bg-accent/50 dark:bg-accent/30 text-accent-foreground ring-primary/50 group-hover:bg-accent/80 ring-1 ring-inset",
                  !isCurrentMonth && "text-muted-foreground/60",
                )}
              >
                {format(day, "d")}
              </time>

              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex flex-grow flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, maxEventsToShow).map((event) => (
                    <button
                      key={event.id}
                      data-calendar-event-id={event.id}
                      className={cn(
                        "w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight text-white transition-all duration-150 hover:brightness-110 md:text-[11px]",
                        event.color ?? "bg-primary/90 dark:bg-primary/80",
                        "focus-visible:ring-ring focus-visible:relative focus-visible:z-10 focus-visible:ring-1",
                        "perspective-1000 transform shadow-md hover:scale-[1.03] hover:shadow-lg",
                      )}
                      style={{ transformStyle: "preserve-3d" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event, e.currentTarget);
                      }}
                      aria-label={`View event: ${event.title}`}
                    >
                      {!(
                        getHours(event.startTime) === 0 &&
                        getMinutes(event.startTime) === 0 &&
                        getHours(event.endTime) === 23 &&
                        getMinutes(event.endTime) === 59
                      ) &&
                        !(
                          getHours(event.startTime) === 0 &&
                          getMinutes(event.startTime) === 0 &&
                          getHours(event.endTime) === 0 &&
                          getMinutes(event.endTime) === 0 &&
                          differenceInMinutes(event.endTime, event.startTime) >=
                            24 * 60 - 1
                        ) && (
                          <span className="mr-1 font-medium opacity-80">
                            {format(event.startTime, "p")
                              .replace(":00", "")
                              .toLowerCase()}
                          </span>
                        )}
                      <span className="font-medium">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > maxEventsToShow && (
                    <Popover>
                      <PopoverTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="text-muted-foreground focus-visible:ring-ring mt-0.5 rounded text-left text-[10px] hover:underline focus-visible:relative focus-visible:z-10 focus-visible:ring-1 md:text-[11px]"
                          aria-label={`Show ${dayEvents.length - maxEventsToShow} more events for ${format(day, "MMMM d")}`}
                        >
                          +{dayEvents.length - maxEventsToShow} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="border-border bg-popover text-popover-foreground w-64 p-2 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h4 className="border-border mb-1.5 border-b pb-1.5 font-serif text-base font-semibold">
                          Events on {format(day, "MMM d")}
                        </h4>
                        <div className="custom-scrollbar max-h-48 space-y-1.5 overflow-y-auto pr-1">
                          {dayEvents.map((event) => (
                            <button
                              key={event.id}
                              data-calendar-event-id={event.id}
                              className={cn(
                                "flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-[11px] leading-tight text-white transition-colors hover:brightness-110",
                                event.color ??
                                  "bg-primary/90 dark:bg-primary/80",
                                "focus-visible:ring-ring focus-visible:relative focus-visible:z-10 focus-visible:ring-1",
                              )}
                              onClick={(e) =>
                                onEventClick(event, e.currentTarget)
                              }
                              aria-label={`View event: ${event.title}`}
                            >
                              <span className="w-10 flex-shrink-0 text-right text-[10px] opacity-80">
                                {format(event.startTime, "p")
                                  .replace(":00", "")
                                  .toLowerCase()}
                              </span>
                              <span className="flex-grow truncate font-medium">
                                {event.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
