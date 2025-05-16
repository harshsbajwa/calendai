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
  addMinutes,
  isSameDay,
  isValid,
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
import { useMediaQuery } from "~/app/calendar/hooks/useMediaQuery";
import { motion, type PanInfo } from "motion/react";
import { api } from "~/trpc/react";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  onGridClick: (dateTime: Date, target: HTMLElement) => void;
  temporaryEvent?: Partial<CalendarEvent> | null;
}

const SCROLL_THRESHOLD_PX = 60;
const SCROLL_SPEED_PX = 10;

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onGridClick,
  temporaryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const utils = api.useUtils();
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartInitialTopRef = useRef<number | null>(null);

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

  const allVisibleEvents = useMemo(() => {
    const fetchedVisible = (events ?? []).filter(
      (event) =>
        isBefore(event.startTime, dayEnd) && isAfter(event.endTime, dayStart),
    );
    if (
      temporaryEvent?.startTime &&
      temporaryEvent?.endTime &&
      isSameDay(temporaryEvent.startTime, currentDate)
    ) {
      return [...fetchedVisible, temporaryEvent as CalendarEvent];
    }
    return fetchedVisible;
  }, [events, dayStart, dayEnd, temporaryEvent, currentDate]);

  const updateEventTimeMutation = api.event.update.useMutation({
    onSuccess: () => {
      void utils.event.getAllByUser.invalidate();
    },
    onError: (error) => {
      console.error(
        "Failed to update event time in DayView:",
        error.message,
        error.data?.zodError ?? error.data ?? error,
      );
      alert("Error updating event time: " + error.message);
      void utils.event.getAllByUser.invalidate();
    },
  });

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragScroll = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (!containerRef.current) return;
    stopScrolling();
    const containerRect = containerRef.current.getBoundingClientRect();
    const pointerY = info.point.y;
    if (pointerY < containerRect.top + SCROLL_THRESHOLD_PX) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current)
          containerRef.current.scrollTop -= SCROLL_SPEED_PX;
      }, 16);
    } else if (pointerY > containerRect.bottom - SCROLL_THRESHOLD_PX) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current)
          containerRef.current.scrollTop += SCROLL_SPEED_PX;
      }, 16);
    }
  };

  const handleDragEnd = (info: PanInfo, calendarEvent: CalendarEvent) => {
    stopScrolling();
    if (
      !isDesktop ||
      calendarEvent.id?.startsWith("temp-") || // Do not update temporary events
      dragStartInitialTopRef.current === null
    ) {
      dragStartInitialTopRef.current = null;
      return;
    }

    const initialTopPixels = dragStartInitialTopRef.current;
    dragStartInitialTopRef.current = null; // Reset for next drag

    const finalTopPixels = initialTopPixels + info.offset.y;
    const durationMinutes = differenceInMinutes(
      calendarEvent.endTime,
      calendarEvent.startTime,
    );
    // Ensure a minimum visual duration for height calculation to avoid division by zero or tiny heights
    const minVisualDurationForHeightCalc = Math.max(15, durationMinutes);
    const eventHeightPixels =
      (minVisualDurationForHeightCalc / 60) * hourHeight;
    const maxPossibleTopPixels = hours.length * hourHeight - eventHeightPixels;

    let snappedTop =
      Math.round(finalTopPixels / (hourHeight / 4)) * (hourHeight / 4); // Snap to 15-min intervals
    snappedTop = Math.max(0, Math.min(snappedTop, maxPossibleTopPixels));

    const minutesFromDayStart = (snappedTop / hourHeight) * 60;
    let newStartTime = addMinutes(dayStart, minutesFromDayStart);
    let newEndTime = addMinutes(newStartTime, durationMinutes);

    if (isAfter(newEndTime, dayEnd)) {
      newEndTime = dayEnd;
      newStartTime = addMinutes(dayEnd, -durationMinutes);
      if (isBefore(newStartTime, dayStart)) {
        // Double check if pulling back made it too early
        newStartTime = dayStart;
        newEndTime = addMinutes(dayStart, durationMinutes);
        if (isAfter(newEndTime, dayEnd)) newEndTime = dayEnd; // Final clamp for all-day events
      }
    }

    if (!isValid(newStartTime) || !isValid(newEndTime)) {
      console.error("DayView: Invalid date calculated in handleDragEnd.", {
        newStartTime,
        newEndTime,
        calendarEventId: calendarEvent.id,
      });
      void utils.event.getAllByUser.invalidate(); // Revert optimistic updates
      return;
    }

    if (
      newStartTime.getTime() !== calendarEvent.startTime.getTime() ||
      newEndTime.getTime() !== calendarEvent.endTime.getTime()
    ) {
      updateEventTimeMutation.mutate({
        id: calendarEvent.id,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } else {
      // If no change, still invalidate to ensure UI consistency if there was a race condition or minor pixel diff
      void utils.event.getAllByUser.invalidate();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const now = new Date();
    let scrollTop: number;
    if (isToday(currentDate)) {
      const currentMinute = getHours(now) * 60 + getMinutes(now);
      scrollTop = Math.max(0, (currentMinute - 30) / 60) * hourHeight; // Scroll to 30 mins before current time
    } else {
      scrollTop = 8 * hourHeight; // Scroll to 8 AM for other days
    }
    requestAnimationFrame(() => {
      // Ensure layout is stable before scrolling
      container.scrollTop = scrollTop;
    });
  }, [currentDate]); // Rerun when currentDate changes

  const handleLocalGridClick = (
    hourDateTime: Date,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesInHour = Math.floor((offsetY / hourHeight) * 60);
    const preciseMinutes = Math.round(minutesInHour / 15) * 15;

    const clickedTime = setMinutes(
      setHours(startOfDay(currentDate), getHours(hourDateTime)),
      preciseMinutes,
    );
    onGridClick(clickedTime, e.currentTarget);
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
        ref={containerRef}
        className="custom-scrollbar relative flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div className="relative grid grid-cols-[auto_1fr]">
          <div
            className={cn(
              "text-muted-foreground dark:text-dark-muted-foreground sticky top-0 left-0 z-10 border-r",
              "border-border/50 dark:border-dark-border/50",
              "bg-transparent",
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
          <div
            className="border-border/50 dark:border-dark-border/50 relative border-l"
            style={{ minHeight: `${hours.length * hourHeight}px` }}
          >
            {/* Hour Slots for Clicks and Visuals */}
            {hours.map((hourDateTime, hourIndex) => (
              <div
                key={`hour-slot-${hourIndex}`}
                className="border-border/30 dark:border-dark-border/30 hover:bg-accent/10 dark:hover:bg-accent/5 relative w-full cursor-pointer border-b opacity-70"
                style={{ height: `${hourHeight}px` }}
                onClick={(e) => handleLocalGridClick(hourDateTime, e)}
                role="button"
                aria-label={
                  isDesktop
                    ? `Create event at ${format(hourDateTime, "h a")}`
                    : `View hour ${format(hourDateTime, "h a")}`
                }
              >
                {/* Optional subtle lines for quarter/half hours */}
                <div className="bg-border/10 dark:bg-dark-border/5 absolute top-[25%] left-0 h-px w-full opacity-50"></div>
                <div className="bg-border/20 dark:bg-dark-border/10 absolute top-[50%] left-0 h-px w-full opacity-50"></div>
                <div className="bg-border/10 dark:bg-dark-border/5 absolute top-[75%] left-0 h-px w-full opacity-50"></div>
              </div>
            ))}
            {/* Event Rendering */}
            {allVisibleEvents.map((event) => {
              const safeEvent = {
                ...event,
                id: event.id ?? `temp-${Date.now()}`,
                title: event.title ?? "New Event",
                color: event.color ?? "bg-gray-400",
                startTime: event.startTime ?? new Date(),
                endTime:
                  event.endTime ??
                  addMinutes(event.startTime ?? new Date(), 60),
              };
              const isTemporary = safeEvent.id.startsWith("temp-");
              const eventPos = calculateEventPositionAndHeightForDay(
                safeEvent,
                currentDate,
              );
              const durationMinutes = differenceInMinutes(
                safeEvent.endTime,
                safeEvent.startTime,
              );
              return (
                <motion.div
                  key={safeEvent.id}
                  data-event-id={safeEvent.id}
                  className={cn(
                    "absolute w-full",
                    isDesktop && !isTemporary
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-default",
                  )}
                  style={{
                    top: eventPos.top,
                    height: eventPos.height,
                    left: "0px",
                    right: "0px",
                    zIndex:
                      10 +
                      (updateEventTimeMutation.variables?.id === safeEvent.id
                        ? 1
                        : 0),
                  }}
                  drag={isDesktop && !isTemporary ? "y" : false}
                  dragConstraints={{
                    top: 0,
                    bottom: hours.length * hourHeight - eventPos.height,
                  }}
                  dragElastic={0.01}
                  dragMomentum={false}
                  onDragStart={(_e, _info) => {
                    const initialMinutesFromDayStart = differenceInMinutes(
                      safeEvent.startTime,
                      dayStart,
                    );
                    dragStartInitialTopRef.current =
                      (initialMinutesFromDayStart / 60) * hourHeight;
                  }}
                  onDrag={handleDragScroll}
                  onDragEnd={(e, info) => handleDragEnd(info, safeEvent)}
                  whileDrag={{
                    scale: 1.01,
                    boxShadow: "0px 8px 16px rgba(0,0,0,0.2)",
                    zIndex: 99,
                  }}
                  dragTransition={{
                    power: 0.2,
                    modifyTarget: (targetY) =>
                      Math.round(targetY / (hourHeight / 4)) * (hourHeight / 4),
                    bounceStiffness: 1000,
                    bounceDamping: 80,
                  }} // Stiff bounce, snap to 15min
                >
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        data-calendar-event-id={safeEvent.id}
                        className={cn(
                          "group focus-visible:ring-ring focus-visible:ring-offset-background mx-[4px] h-full w-[calc(100%-8px)] overflow-hidden rounded-lg p-1.5 text-[11px] text-white shadow-lg transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-1 md:text-xs",
                          "perspective-1000 hover:shadow-xl hover:brightness-110",
                          safeEvent.color ?? "bg-primary/90 dark:bg-primary/80",
                          "active:brightness-90",
                          updateEventTimeMutation.variables?.id ===
                            safeEvent.id &&
                            updateEventTimeMutation.isPending &&
                            "animate-pulse opacity-70",
                          isTemporary &&
                            "pointer-events-none border-2 border-dashed border-white/50 opacity-70",
                        )}
                        style={{ transformStyle: "preserve-3d" }}
                        onClick={(_e) =>
                          !isTemporary &&
                          onEventClick(safeEvent, _e.currentTarget)
                        }
                        aria-label={
                          isTemporary
                            ? safeEvent.title
                            : `View event: ${safeEvent.title}`
                        }
                        disabled={isTemporary}
                      >
                        <div className="line-clamp-1 text-left leading-tight font-semibold">
                          {safeEvent.title}
                        </div>
                        {durationMinutes > 20 && (
                          <div className="text-left text-[10px] leading-tight opacity-80 group-hover:opacity-90 md:text-[11px]">{`${format(safeEvent.startTime, "p")} - ${format(safeEvent.endTime, "p")}`}</div>
                        )}
                        {safeEvent.location &&
                          durationMinutes > 35 &&
                          safeEvent.location.length < 25 && (
                            <div className="mt-0.5 line-clamp-1 text-left text-[10px] leading-tight opacity-70 group-hover:opacity-80 md:text-[11px]">
                              <MapPin className="mr-0.5 inline h-2.5 w-2.5 flex-shrink-0" />
                              {safeEvent.location}
                            </div>
                          )}
                      </button>
                    </TooltipTrigger>
                    {!isTemporary && (
                      <TooltipContent>
                        <p className="font-semibold">{safeEvent.title}</p>
                        <p className="text-xs">{`${format(safeEvent.startTime, "p")} - ${format(safeEvent.endTime, "p")}`}</p>
                        {safeEvent.location && (
                          <p className="mt-1 flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" /> {safeEvent.location}
                          </p>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </motion.div>
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
