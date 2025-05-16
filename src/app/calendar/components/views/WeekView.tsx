"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
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
  addMinutes,
  addDays,
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
  timeGutterWidthPixels,
  calculateEventPositionAndHeightForDay,
} from "~/app/calendar/utils/utils";
import { useMediaQuery } from "~/app/calendar/hooks/useMediaQuery";
import { motion, type PanInfo, type Point } from "motion/react";
import { api } from "~/trpc/react";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  daysInWeek: Date[];
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: "day" | "week" | "month") => void;
  onGridClick: (dateTime: Date, target: HTMLElement) => void;
  temporaryEvent?: Partial<CalendarEvent> | null;
}

const SCROLL_THRESHOLD_PX = 60;
const SCROLL_SPEED_PX = 10;

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  daysInWeek,
  setCurrentDate,
  setCurrentView,
  onGridClick,
  temporaryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null); 
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const utils = api.useUtils();
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [dayColumnWidth, setDayColumnWidth] = useState(0);
  const dragStartDataRef = useRef<{ initialTopInColumn: number; initialColumnLeftInGrid: number; originalDayIndex: number } | null>(null);


  useEffect(() => {
      const calculateWidth = () => {
        if (gridRef.current) {
            const totalGridWidth = gridRef.current.offsetWidth;
            setDayColumnWidth(totalGridWidth / daysInWeek.length);
        }
      };
      calculateWidth();
      const resizeObserver = new ResizeObserver(calculateWidth);
      if (gridRef.current) {
          resizeObserver.observe(gridRef.current);
      }
      return () => {
          if (gridRef.current && resizeObserver) {
              resizeObserver.unobserve(gridRef.current);
          }
          resizeObserver.disconnect();
      };
  }, [daysInWeek.length]);


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

  const allVisibleEvents = useMemo(() => {
    const fetchedVisible = (events ?? []).filter(event =>
        isBefore(event.startTime, weekEnd) && isAfter(event.endTime, weekStart)
    );
    if (temporaryEvent?.startTime && temporaryEvent?.endTime &&
        isAfter(temporaryEvent.startTime, addDays(weekStart, -1)) && 
        isBefore(temporaryEvent.endTime, addDays(weekEnd, 1))) {
      return [...fetchedVisible, temporaryEvent as CalendarEvent];
    }
    return fetchedVisible;
  }, [events, weekStart, weekEnd, temporaryEvent]);

  const updateEventTimeMutation = api.event.update.useMutation({
    onSuccess: () => {
      void utils.event.getAllByUser.invalidate();
    },
    onError: (error) => {
      console.error("Failed to update event time in WeekView:", error.message, error.data?.zodError ?? error.data ?? error);
      alert("Error updating event time: " + error.message);
      void utils.event.getAllByUser.invalidate();
    }
  });

  const stopScrolling = () => {
      if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
      }
  };

  const handleDragScroll = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!containerRef.current) return;
        stopScrolling();
        const containerRect = containerRef.current.getBoundingClientRect();
        const pointerY = info.point.y; 

        if (pointerY < containerRect.top + SCROLL_THRESHOLD_PX) {
            scrollIntervalRef.current = setInterval(() => {
                if (containerRef.current) containerRef.current.scrollTop -= SCROLL_SPEED_PX;
            }, 16);
        } else if (pointerY > containerRect.bottom - SCROLL_THRESHOLD_PX) {
            scrollIntervalRef.current = setInterval(() => {
                if (containerRef.current) containerRef.current.scrollTop += SCROLL_SPEED_PX;
            }, 16);
        }
    };

  const handleDragEnd = (
    info: PanInfo,
    calendarEvent: CalendarEvent,
  ) => {
    stopScrolling();
    if (!isDesktop || calendarEvent.id?.startsWith('temp-') || !gridRef.current || dayColumnWidth <= 0 || !dragStartDataRef.current) {
      dragStartDataRef.current = null;
      return;
    }

    const { initialTopInColumn, initialColumnLeftInGrid, originalDayIndex } = dragStartDataRef.current;
    dragStartDataRef.current = null; 

    const { offset } = info; 

    // --- X-axis (Day) Calculation ---
    const finalEventLeftInGrid = initialColumnLeftInGrid + offset.x;
    
    let targetDayIndex = Math.round(finalEventLeftInGrid / dayColumnWidth);
    targetDayIndex = Math.max(0, Math.min(daysInWeek.length - 1, targetDayIndex));
    const targetDay = daysInWeek[targetDayIndex]!;
    const targetDayStart = startOfDay(targetDay);

    // --- Y-axis (Time) Calculation ---
    const finalTopInColumn = initialTopInColumn + offset.y;
    const durationMinutes = differenceInMinutes(calendarEvent.endTime, calendarEvent.startTime);
    const minVisualDurationForHeightCalc = Math.max(15, durationMinutes);
    const eventHeightPixels = (minVisualDurationForHeightCalc / 60) * hourHeight;
    const maxTopInColumn = (hours.length * hourHeight) - eventHeightPixels;

    let snappedTopInColumn = Math.round(finalTopInColumn / hourHeight) * hourHeight;
    snappedTopInColumn = Math.max(0, Math.min(snappedTopInColumn, maxTopInColumn));

    const targetHourIndex = Math.max(0, Math.min(23, Math.round(snappedTopInColumn / hourHeight)));
    let newStartTime = setMinutes(setHours(targetDayStart, targetHourIndex), 0);
    let newEndTime = addMinutes(newStartTime, durationMinutes);
    
    const targetDayEnd = endOfDay(targetDayStart);
     if (isAfter(newEndTime, targetDayEnd)) { 
        newEndTime = targetDayEnd;
        newStartTime = addMinutes(targetDayEnd, -durationMinutes);
        if (isBefore(newStartTime, targetDayStart)) { 
            newStartTime = targetDayStart;
            newEndTime = addMinutes(targetDayStart, durationMinutes);
            if (isAfter(newEndTime, targetDayEnd)) newEndTime = targetDayEnd;
        }
    }

    if (!isValid(newStartTime) || !isValid(newEndTime)) {
        console.error("WeekView: Invalid date calculated in handleDragEnd.", { newStartTime, newEndTime, calendarEvent });
        void utils.event.getAllByUser.invalidate();
        return;
    }

    if (newStartTime.getTime() !== calendarEvent.startTime.getTime() || newEndTime.getTime() !== calendarEvent.endTime.getTime()) {
        updateEventTimeMutation.mutate({
            id: calendarEvent.id,
            startTime: newStartTime,
            endTime: newEndTime,
        });
    } else {
        void utils.event.getAllByUser.invalidate();
    }
  };


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const now = new Date();
    const todayInView = daysInWeek.some((day) => isToday(day));
    let scrollTop: number;

    if (todayInView && isSameDay(currentDate, now)) { 
      const currentMinute = getHours(now) * 60 + getMinutes(now);
      scrollTop = Math.max(0, (currentMinute - 30) / 60) * hourHeight; 
    } else {
      scrollTop = 8 * hourHeight; 
    }
    requestAnimationFrame(() => {
      container.scrollTop = scrollTop;
    });
  }, [daysInWeek, currentDate]); 

  const handleLocalGridClick = (
    day: Date, 
    hourDateTime: Date, 
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    const clickedTime = setMinutes(setHours(startOfDay(day), getHours(hourDateTime)), 0);
    onGridClick(clickedTime, e.currentTarget);
  };

  return (
    <div className={cn(
        "isolate flex h-full flex-col overflow-hidden rounded-xl border-2 shadow-2xl ring-1 ring-black/5",
        "border-white/20 dark:border-white/10",
        "bg-glass-pane",
        "backdrop-blur-[12px] backdrop-saturate-150"
      )}>
      <div
        className={cn(
          "sticky top-0 z-20 grid flex-shrink-0 border-b-2 shadow-xl",
          "border-border/30 dark:border-dark-border/20",
          "bg-transparent backdrop-blur-[var(--blur-intensity-strong)]",
          "transform-gpu",
        )}
        style={{ gridTemplateColumns: `${timeGutterWidthPixels}px repeat(${daysInWeek.length}, 1fr)` }}
      >
        <div
          className={cn( 
            "text-muted-foreground dark:text-dark-muted-foreground py-2 text-center text-xs font-medium border-r border-border/30 dark:border-dark-border/20"
          )}
        />
        {daysInWeek.map((day) => (
          <div key={day.toISOString()} className="p-1.5 text-center md:p-2 border-r border-border/30 dark:border-dark-border/20 last:border-r-0">
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
                      : "text-foreground hover:bg-accent/20 dark:hover:bg-accent/10",
                    !isToday(day) &&
                      isSameDay(day, currentDate) && 
                      "bg-accent/50 dark:bg-accent/30 text-accent-foreground ring-primary/50 ring-1",
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

      <div
        ref={containerRef} 
        className="custom-scrollbar relative flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div className="relative flex">
          <div
            className={cn(
              "border-border/30 dark:border-dark-border/20 sticky top-0 left-0 z-10 border-r", 
              "bg-transparent backdrop-blur-sm", 
              "transform-gpu",
              timeGutterWidthClass,
            )}
            style={{ height: `${hours.length * hourHeight}px`}} 
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

          <div ref={gridRef} className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInWeek.length}, 1fr)`}}>
            {daysInWeek.map((day, dayIndex) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-border/30 dark:border-dark-border/20 relative border-l",
                   dayIndex === 0 && "border-l-0", 
                )}
                style={{ minHeight: `${hours.length * hourHeight}px` }}
                data-day-index={dayIndex} 
              >
                {hours.map((hourDateTime, hourIndex) => (
                  <div
                    key={`${day.toISOString()}-h-${hourIndex}`}
                    className="border-border/20 dark:border-dark-border/10 hover:bg-accent/10 dark:hover:bg-accent/5 relative w-full cursor-pointer border-b opacity-70"
                    style={{ height: `${hourHeight}px` }}
                    onClick={(e) => handleLocalGridClick(day, hourDateTime, e)}
                    role="button"
                    aria-label={isDesktop ? `Create event on ${format(day, "MMM d")} at ${format(hourDateTime, "h a")}`: `View ${format(day, "MMM d")} at ${format(hourDateTime, "h a")}`}
                  >
                      <div className="absolute top-[25%] left-0 w-full h-px bg-border/5 dark:bg-dark-border/5 opacity-50"></div>
                      <div className="absolute top-[50%] left-0 w-full h-px bg-border/10 dark:bg-dark-border/10 opacity-50"></div>
                      <div className="absolute top-[75%] left-0 w-full h-px bg-border/5 dark:bg-dark-border/5 opacity-50"></div>
                  </div>
                ))}

                {allVisibleEvents
                  .filter((event) => {
                    const eventDayStart = startOfDay(day);
                    const eventDayEnd = endOfDay(day);
                    return isBefore(event.startTime, eventDayEnd) && isAfter(event.endTime, eventDayStart);
                  })
                  .map((event) => {
                    const safeEvent = {
                      ...event,
                      id: event.id ?? `temp-${Date.now()}`,
                      title: event.title ?? "New Event",
                      color: event.color ?? "bg-gray-400",
                      startTime: event.startTime ?? new Date(),
                      endTime: event.endTime ?? addMinutes(event.startTime ?? new Date(), 60),
                    };
                    const isTemporary = safeEvent.id.startsWith('temp-');
                    const eventPos = calculateEventPositionAndHeightForDay(safeEvent, day);
                    const durationMinutes = differenceInMinutes(safeEvent.endTime, safeEvent.startTime);

                    return (
                      <motion.div
                        key={safeEvent.id}
                        data-event-id={safeEvent.id}
                        className={cn("absolute w-full", isDesktop && !isTemporary ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
                        style={{ 
                          top: eventPos.top,
                          height: eventPos.height,
                          left: "0px", 
                          right: "0px",
                          zIndex: 10 + (updateEventTimeMutation.variables?.id === safeEvent.id ? 1 : 0),
                        }}
                        drag={isDesktop && !isTemporary} 
                        dragConstraints={gridRef} 
                        dragElastic={0.05}
                        dragMomentum={false}
                        onDragStart={(e, info) => {
                            const eventEl = e.target as HTMLElement;
                            const dayColumnEl = eventEl.parentElement; 
                            if (!dayColumnEl || !gridRef.current || dayColumnWidth <= 0) return;

                            const eventRect = eventEl.getBoundingClientRect();
                            const dayColumnRect = dayColumnEl.getBoundingClientRect();
                            const gridRect = gridRef.current.getBoundingClientRect();
                            
                            const initialTop = parseFloat(eventEl.style.top ?? '0'); // Top of event within its column
                            const colLeft = dayColumnEl.offsetLeft; // Left of column within gridRef

                            dragStartDataRef.current = {
                                initialTopInColumn: initialTop,
                                initialColumnLeftInGrid: colLeft,
                                originalDayIndex: dayIndex,
                            };
                        }}
                        onDrag={handleDragScroll}
                        onDragEnd={(e, info) => handleDragEnd(info, safeEvent)}
                        whileDrag={{ scale: 1.01, boxShadow: "0px 8px 16px rgba(0,0,0,0.2)", zIndex: 99 }}
                        dragTransition={{
                            power: 0.15,
                            modifyTarget: (targetPoint: Point): Point => {
                                if (!dragStartDataRef.current || dayColumnWidth <=0 ) return targetPoint;
                                const currentYInColumn = dragStartDataRef.current.initialTopInColumn + targetPoint.y;
                                const snappedYInColumn = Math.round(currentYInColumn / hourHeight) * hourHeight;
                                const finalDeltaY = snappedYInColumn - dragStartDataRef.current.initialTopInColumn;

                                const currentXInGrid = dragStartDataRef.current.initialColumnLeftInGrid + targetPoint.x;
                                const snappedXInGrid = Math.round(currentXInGrid / dayColumnWidth) * dayColumnWidth;
                                const finalDeltaX = snappedXInGrid - dragStartDataRef.current.initialColumnLeftInGrid;
                                
                                return { x: finalDeltaX, y: finalDeltaY };
                            }
                        }}
                      >
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <button
                              data-calendar-event-id={safeEvent.id}
                              className={cn(
                                "group focus-visible:ring-ring focus-visible:ring-offset-background w-[calc(100%-8px)] mx-[4px] h-full overflow-hidden rounded-lg p-1.5 text-[11px] text-white shadow-lg transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-1 md:text-xs",
                                "hover:shadow-xl hover:brightness-110 perspective-1000",
                                safeEvent.color ?? "bg-primary/90 dark:bg-primary/80",
                                "active:brightness-90",
                                updateEventTimeMutation.variables?.id === safeEvent.id && updateEventTimeMutation.isPending && "opacity-70 animate-pulse",
                                isTemporary && "opacity-70 border-2 border-dashed border-white/50 pointer-events-none"
                              )}
                              style={{ transformStyle: "preserve-3d" }}
                              onClick={(e) => !isTemporary && onEventClick(safeEvent, e.currentTarget)}
                              aria-label={isTemporary ? safeEvent.title : `View event: ${safeEvent.title}`}
                              disabled={isTemporary}
                            >
                               <div className="line-clamp-1 text-left font-semibold leading-tight">
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
              </div>
            ))}
          </div>

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