"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
} from "lucide-react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from "date-fns";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import UpcomingEventsView from "./UpcomingEventsView";
import SidebarFooterActions from "./SidebarFooterActions";
import ManageCalendarsDialog from "./ManageCalendarsDialog";
import type {
  CalendarEvent,
} from "~/app/calendar/utils/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Shared gradient button style
const sharedGradientButtonStyle = cn(
  "bg-gradient-to-r dark:bg-white/5 isolate bg-white/30 ring-black/5",
  "shadow focus:outline-none",
  "focus:ring focus:ring-slate-500/50 focus-visible:outline-none focus-visible:ring",
  "focus-visible:ring-slate-500/50 relative before:absolute before:inset-0 before:rounded-[inherit]",
  "before:bg-[linear-gradient(45deg,transparent_25%,theme(colors.white/.5)_50%,transparent_75%,transparent_100%)]",
  "dark:before:bg-[linear-gradient(45deg,transparent_25%,theme(colors.white)_50%,transparent_75%,transparent_100%)]",
  "before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat",
  "before:[transition:background-position_0s_ease] hover:before:bg-[position:-100%_0,0_0] hover:before:duration-[1500ms]",
);

interface SidebarContentProps {
  currentDate: Date;
  setCurrentDate: (date: Date | ((prevDate: Date) => Date)) => void;
  onOpenCreateDialog: () => void;
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  isExpanded: boolean;
  toggleSidebar: () => void; // For the expand/collapse button
  isMobile?: boolean;
  className?: string;
  style?: React.CSSProperties;
  selectedCalendarIds: string[]; // For checkboxes
  setSelectedCalendarIds: (
    ids: string[] | ((prev: string[]) => string[]),
  ) => void; // For checkboxes
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  currentDate,
  setCurrentDate,
  onOpenCreateDialog,
  onEventClick,
  isExpanded,
  toggleSidebar,
  isMobile = false,
  className,
  style,
  selectedCalendarIds,
  setSelectedCalendarIds,
}) => {
  const [isManageCalendarsOpen, setIsManageCalendarsOpen] = useState(false);

  const { data: userCalendars, isLoading: isLoadingUserCalendars } =
    api.userCalendar.getAll.useQuery();
  const utils = api.useUtils();

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const calendarStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
  const miniCalendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const handleSidebarContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.tagName === "DIV" && targetElement === e.currentTarget) {
      if (!isMobile && isExpanded) {
        toggleSidebar();
      } else if (!isMobile && !isExpanded) {
        toggleSidebar();
      }
    }
  };

  const handleCalendarCheckboxChange = (
    calendarId: string,
    checked: boolean,
  ) => {
    setSelectedCalendarIds((prev) =>
      checked ? [...prev, calendarId] : prev.filter((id) => id !== calendarId),
    );
  };

  return (
    <div
      className={cn(
        "custom-scrollbar flex h-full flex-col overflow-x-hidden overflow-y-auto p-3",
        className,
      )}
      style={style}
      onClick={handleSidebarContentClick}
    >
      <div
        className={cn(
          "mb-3 flex items-center",
          isExpanded || isMobile ? "justify-between" : "justify-center",
        )}
      >
        {(isExpanded || isMobile) && (
          <h1 className="text-foreground ml-1 text-2xl font-semibold tracking-tight lowercase">
            calendai
          </h1>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebar();
              }}
              aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isExpanded ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isExpanded ? "bottom" : "right"}>
            <p>{isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        className={cn(
          "flex flex-col",
          isExpanded || isMobile ? "gap-3" : "items-center gap-2",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              className={cn(
                "w-full justify-center shadow-md transition-all duration-300 ease-in-out hover:shadow-2xl",
                "text-md inline-flex justify-center rounded-lg px-3.5 py-2.5 font-medium whitespace-nowrap",
                sharedGradientButtonStyle,
                isExpanded || isMobile
                  ? "h-10 gap-2"
                  : "h-10 w-10 rounded-full p-0",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateDialog();
              }}
              aria-label="Create new event"
            >
              <Plus className="h-5 w-5 flex-shrink-0" />
              {(isExpanded || isMobile) && (
                <span className="truncate pt-0.5 font-medium">
                  Create Event
                </span>
              )}
            </Button>
          </TooltipTrigger>
          {/* Only show tooltip text if button text is hidden */}
          {!(isExpanded || isMobile) && (
            <TooltipContent side="right">
              <p>Create a New Event</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Main content of the sidebar, conditionally rendered for expansion */}
      <div
        className={cn(
          "flex-grow overflow-hidden transition-opacity duration-300 ease-in-out",
          isExpanded || isMobile
            ? "mt-4 opacity-100"
            : "pointer-events-none h-0 opacity-0",
        )}
      >
        <div className={isExpanded || isMobile ? "my-6" : "hidden"}>
          {" "}
          {/* Mini Calendar */}
          <div className="mb-2 flex items-center px-1">
            <h3 className="text-foreground w-full font-serif text-lg font-medium">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <div className="flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Previous Month"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentDate((prev: Date) => add(prev, { months: -1 }));
                    }}
                  >
                    <ChevronLeft className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Previous Month</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Next Month"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentDate((prev: Date) => add(prev, { months: 1 }));
                    }}
                  >
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Next Month</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
              <div
                key={`${d}-${index}`}
                className="text-muted-foreground py-1 text-xs font-medium"
              >
                {d}
              </div>
            ))}
            {miniCalendarDays.map((day) => {
              const isCurrMonth = isSameMonth(day, currentDate);
              return (
                <Tooltip key={day.toISOString()}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={format(day, "PPP")}
                      className={cn(
                        "h-7 w-7 rounded-full p-0 text-xs font-normal transition-colors duration-150",
                        !isCurrMonth &&
                          "text-muted-foreground/40 hover:bg-accent/50",
                        isToday(day) &&
                          isCurrMonth &&
                          "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
                        isSameDay(day, currentDate) &&
                          !isToday(day) &&
                          isCurrMonth &&
                          "bg-accent text-accent-foreground ring-primary/50 ring-1 ring-inset",
                        !isToday(day) &&
                          !isSameDay(day, currentDate) &&
                          isCurrMonth &&
                          "text-foreground hover:bg-accent",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDate(day);
                      }}
                    >
                      {format(day, "d")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{format(day, "MMMM d, yyyy")}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className={isExpanded || isMobile ? "mb-6" : "hidden"}>
          {" "}
          {/* My Calendars */}
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-foreground font-serif text-lg font-medium">
              My Calendars
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-6 w-6"
                  aria-label="Manage calendars"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsManageCalendarsOpen(true);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Manage Calendars</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-1.5">
            {isLoadingUserCalendars && (
              <p className="text-muted-foreground px-1 text-xs italic">
                Loading calendars...
              </p>
            )}
            {userCalendars?.map((cal) => (
              <div
                key={cal.id}
                className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1.5"
                onClick={(e) => e.stopPropagation()}
                role="group"
              >
                <Checkbox
                  id={`cal-filter-${cal.id}`}
                  checked={selectedCalendarIds.includes(cal.id)}
                  onCheckedChange={(checked) =>
                    handleCalendarCheckboxChange(cal.id, !!checked)
                  }
                  className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                  aria-label={`Toggle visibility for ${cal.name} calendar in view`}
                />
                <div
                  className={cn("h-3 w-3 flex-shrink-0 rounded-sm", cal.color)}
                ></div>
                <Label
                  htmlFor={`cal-filter-${cal.id}`}
                  className="text-foreground/90 flex-grow cursor-pointer truncate text-sm font-normal"
                >
                  {cal.name}
                </Label>
              </div>
            ))}
            {(!userCalendars || userCalendars.length === 0) &&
              !isLoadingUserCalendars && (
                <p className="text-muted-foreground px-1 text-xs italic">
                  No calendars created yet. Click edit to add.
                </p>
              )}
          </div>
        </div>

        <div className={isExpanded || isMobile ? "mt-0" : "hidden"}>
          <h3 className="text-foreground mb-2 px-1 font-serif text-lg font-medium">
            Upcoming
          </h3>
          {/* Ensure the onEventClick here matches the one passed down from page.tsx */}
          <UpcomingEventsView onEventClick={onEventClick} />
        </div>
      </div>

      {!isMobile && (
        <div
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            isExpanded ? "opacity-100" : "opacity-100",
          )}
        >
          {" "}
          {/* Keep icons visible when collapsed */}
          <SidebarFooterActions isExpanded={isExpanded} />
        </div>
      )}

      <ManageCalendarsDialog
        isOpen={isManageCalendarsOpen}
        setIsOpen={setIsManageCalendarsOpen}
        onCalendarsUpdate={() => {
          void utils.userCalendar.getAll.invalidate();
          void utils.event.getAllByUser.invalidate(); // Also refetch events if calendars change
        }}
      />
    </div>
  );
};

export default SidebarContent;
