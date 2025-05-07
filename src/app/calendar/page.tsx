"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  User as UserIcon,
  LogOut,
  Settings,
  Search,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addHours,
  subDays,
  addDays,
  endOfDay,
  startOfDay,
} from "date-fns";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

// UI Components
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "~/components/ui/popover";

// Calendar Specific Components
import LoadingScreen from "./components/LoadingScreen";
import RedirectToSignIn from "./components/RedirectToSignIn";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/sidebar/Sidebar";
import SidebarContent from "./components/sidebar/SidebarContent";
import DayView from "./components/views/DayView";
import WeekView from "./components/views/WeekView";
import MonthView from "./components/views/MonthView";
import AgendaPanel from "./components/AgendaPanel";
import CreateEventDialog from "./components/dialogs_popovers/CreateEventDialog";
import EventDetailPopover from "./components/dialogs_popovers/EventDetailPopover";
import EventForm from "./components/dialogs_popovers/EventForm";

// Utils & Types
import {
  agendaPanelCollapsedWidth,
  agendaPanelExpandedWidth,
  type CalendarEvent,
} from "./utils/utils";
import { useResizablePanels } from "./hooks/useResizablePanels";

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

export default function CalendarPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"week" | "month" | "day">(
    "week",
  );

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [isEventPopoverOpen, setIsEventPopoverOpen] = useState(false);
  const eventPopoverAnchorRef = useRef<HTMLElement | null>(null);

  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);

  const [isGridCreatePopoverOpen, setIsGridCreatePopoverOpen] = useState(false);
  const [gridCreateDateTime, setGridCreateDateTime] = useState<Date | null>(
    null,
  );
  const gridCreatePopoverAnchorRef = useRef<HTMLElement | null>(null);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isAgendaPanelExpanded, setIsAgendaPanelExpanded] = useState(true);

  const { data: sessionData, status: sessionStatus } = useSession();
  const utils = api.useUtils();

  const { data: userCalendars } = api.userCalendar.getAll.useQuery(undefined, {
    enabled: sessionStatus === "authenticated",
  });
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  useEffect(() => {
    if (userCalendars) {
      setSelectedCalendarIds(
        userCalendars.filter((c) => c.isVisible).map((c) => c.id),
      );
    }
  }, [userCalendars]);

  const viewDateRange = useMemo(() => {
    let start, end;
    const baseDate = startOfDay(currentDate);
    if (currentView === "week") {
      start = startOfWeek(baseDate, { weekStartsOn: 0 });
      end = endOfWeek(baseDate, { weekStartsOn: 0 });
    } else if (currentView === "month") {
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);
      start = startOfWeek(monthStart, { weekStartsOn: 0 });
      end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    } else {
      start = baseDate;
      end = endOfDay(baseDate);
    }
    return { start: subDays(start, 1), end: addDays(end, 1) };
  }, [currentDate, currentView]);

  const {
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = api.event.getAllByUser.useQuery(
    {
      startDate: viewDateRange.start,
      endDate: viewDateRange.end,
      userCalendarIds: selectedCalendarIds,
    },
    {
      enabled: sessionStatus === "authenticated",
      placeholderData: (prev) => prev,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000,
    },
  );
  const safeEvents = useMemo(() => events ?? [], [events]);

  const daysInWeek = useMemo(() => {
    const firstDay = startOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({
      start: firstDay,
      end: endOfWeek(firstDay, { weekStartsOn: 0 }),
    });
  }, [currentDate]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handlers
  const handleEventClick = useCallback(
    (event: CalendarEvent, target: HTMLElement) => {
      setSelectedEvent(event);
      eventPopoverAnchorRef.current = target;
      setIsEventPopoverOpen(true);
      setIsGridCreatePopoverOpen(false);
    },
    [],
  );

  const [gridCreatePopoverSide, setGridCreatePopoverSide] = useState<
    "left" | "right"
  >("right");

  const handleGridClick = useCallback((dateTime: Date, target: HTMLElement) => {
    setGridCreateDateTime(dateTime);
    gridCreatePopoverAnchorRef.current = target;

    const targetRect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const spaceRight = viewportWidth - targetRect.right;
    const popoverWidth = 384;

    if (spaceRight < popoverWidth && targetRect.left > popoverWidth) {
      setGridCreatePopoverSide("left");
    } else {
      setGridCreatePopoverSide("right");
    }

    setIsGridCreatePopoverOpen(true);
    setIsEventPopoverOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleGoToToday = useCallback(() => setCurrentDate(new Date()), []);
  const handleNavigate = useCallback(
    (direction: "next" | "prev") => {
      const amount = direction === "next" ? 1 : -1;
      const unit =
        currentView === "week"
          ? "weeks"
          : currentView === "month"
            ? "months"
            : "days";
      setCurrentDate((prevDate) => add(prevDate, { [unit]: amount }));
    },
    [currentView],
  );

  const handleToggleView = useCallback((view?: "day" | "week" | "month") => {
    if (view) setCurrentView(view);
    else
      setCurrentView((prev) =>
        prev === "day" ? "week" : prev === "week" ? "month" : "day",
      );
  }, []);

  const toggleSidebar = useCallback(
    () => setIsSidebarExpanded((prev) => !prev),
    [],
  );
  const toggleAgendaPanel = useCallback(
    () => setIsAgendaPanelExpanded((prev) => !prev),
    [],
  );

  useEffect(() => {
    if (!isEventPopoverOpen) {
      const timer = setTimeout(() => {
        setSelectedEvent(null);
        eventPopoverAnchorRef.current = null;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEventPopoverOpen]);

  useEffect(() => {
    if (!isGridCreatePopoverOpen) {
      const timer = setTimeout(() => {
        setGridCreateDateTime(null);
        gridCreatePopoverAnchorRef.current = null;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isGridCreatePopoverOpen]);

  const createEventFromGridMutation = api.event.create.useMutation({
    onSuccess: () => {
      void utils.event.getAllByUser.invalidate();
      setIsGridCreatePopoverOpen(false);
    },
    onError: (error) => {
      alert(`Failed to create event: ${error.message}`);
      console.error("Create Event from Grid Error:", error);
    },
  });

  const {
    mainPanelStyle,
    startResizing,
    containerRef: resizableContainerRef,
    isResizing,
  } = useResizablePanels(
    70,
    300,
    parseFloat(/(\d+(\.\d+)?)/.exec(agendaPanelCollapsedWidth)?.[0] ?? "64") *
      (agendaPanelCollapsedWidth.includes("rem") ? 16 : 1),
  );

  if (!isMounted || sessionStatus === "loading")
    return <LoadingScreen message="Loading Calendar..." />;
  if (
    sessionStatus === "authenticated" &&
    isLoadingEvents &&
    !events &&
    selectedCalendarIds.length > 0
  )
    return <LoadingScreen message="Loading Events..." />;
  if (sessionStatus === "unauthenticated") return <RedirectToSignIn />;
  if (eventsError)
    return (
      <div className="bg-destructive text-destructive-foreground flex h-screen w-screen items-center justify-center">
        Error loading calendar data: {eventsError.message}. Please try
        refreshing.
      </div>
    );
  if (!sessionData?.user) return <RedirectToSignIn />;

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onOpenCreateDialog={() => setIsCreateEventDialogOpen(true)}
          onEventClick={(event, target) => handleEventClick(event, target)}
          isExpanded={isSidebarExpanded}
          toggleSidebar={toggleSidebar}
          selectedCalendarIds={selectedCalendarIds}
          setSelectedCalendarIds={setSelectedCalendarIds}
          className="hidden md:flex"
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header
            className={cn(
              "relative z-30 flex h-16 flex-shrink-0 items-center justify-between border-b px-4 py-2 shadow-sm",
              "border-border/50 dark:border-border/30",
              "bg-[hsl(var(--background))]/[var(--bg-opacity-light)] dark:bg-[hsl(var(--dark-background))]/[var(--bg-opacity-dark)]",
              "backdrop-blur-[--blur-intensity]",
              "transform-gpu",
            )}
          >
            <div className="flex items-center gap-2">
              {/* Mobile Menu Trigger (for Sidebar) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open menu"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onOpenCreateDialog={() => setIsCreateEventDialogOpen(true)}
                    onEventClick={(event: CalendarEvent, target: HTMLElement) =>
                      handleEventClick(event, target)
                    }
                    isExpanded={true}
                    toggleSidebar={() => {
                    }}
                    isMobile={true}
                    className="h-full border-r-0 shadow-none"
                    selectedCalendarIds={selectedCalendarIds}
                    setSelectedCalendarIds={setSelectedCalendarIds}
                  />
                </SheetContent>
              </Sheet>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className={cn(
                      "hidden px-3 md:inline-flex",
                      sharedGradientButtonStyle,
                    )}
                    onClick={handleGoToToday}
                    aria-label="Go to today"
                  >
                    Today
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Go to Today</p>
                </TooltipContent>
              </Tooltip>

              <div className="border-border flex items-center overflow-hidden rounded-md border shadow-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-none rounded-l-md border-0 border-r"
                      onClick={() => handleNavigate("prev")}
                      aria-label={`Previous ${currentView}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Previous {currentView}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-none rounded-r-md border-0"
                      onClick={() => handleNavigate("next")}
                      aria-label={`Next ${currentView}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Next {currentView}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <h2 className="text-foreground ml-2 font-serif text-lg font-medium md:text-xl">
                {format(
                  currentDate,
                  currentView === "month" ? "MMMM yyyy" : "MMMM d, yyyy",
                )}
              </h2>
            </div>

            <div className="absolute top-1/2 left-1/2 w-1/3 max-w-md min-w-[200px] -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  aria-label="Search events"
                  className={cn(
                    "h-9 w-full pl-9",
                    "isolate bg-zinc-100/80 bg-gradient-to-r ring-1 ring-zinc-400/20 dark:bg-zinc-800/80 dark:ring-zinc-700/30",
                    "focus:ring-primary/50",
                  )}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Calendar View Selector Animation */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "group w-20 justify-between capitalize md:w-24",
                      sharedGradientButtonStyle,
                    )}
                    aria-label={`Current view: ${currentView}. Change view.`}
                  >
                    {currentView}
                    <ChevronDown className="ml-1 h-4 w-4 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => handleToggleView("day")}
                    className={cn(
                      currentView === "day" && "bg-accent font-semibold",
                      "hover:bg-accent/70 dark:hover:bg-accent/70",
                    )}
                  >
                    Day
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleView("week")}
                    className={cn(
                      currentView === "week" && "bg-accent font-semibold",
                      "hover:bg-accent/70 dark:hover:bg-accent/70",
                    )}
                  >
                    Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleView("month")}
                    className={cn(
                      currentView === "month" && "bg-accent font-semibold",
                      "hover:bg-accent/70 dark:hover:bg-accent/70",
                    )}
                  >
                    Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <div className="md:hidden">
                {" "}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                      aria-label="Open user menu"
                    >
                      {sessionData?.user?.image ? (
                        <Image
                          src={sessionData.user.image}
                          alt={sessionData.user.name ?? "User"}
                          fill
                          sizes="36px"
                          className="rounded-full object-cover"
                          priority={false}
                        />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm leading-none font-medium">
                          {sessionData?.user?.name ?? "Account"}
                        </p>
                        <p className="text-muted-foreground text-xs leading-none">
                          {sessionData?.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer dark:text-red-400 dark:focus:text-red-400"
                      onClick={() => {
                        window.location.href = "/api/auth/signout";
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main content + Agenda Panel */}
          <div
            ref={resizableContainerRef}
            className="flex flex-1 overflow-hidden"
          >
            <main
              className="custom-scrollbar overflow-x-hidden overflow-y-auto p-1 pb-2 md:p-2 lg:p-3"
              style={{
                ...mainPanelStyle,
                minWidth: `${parseFloat(/(\d+(\.\d+)?)/.exec(agendaPanelCollapsedWidth)?.[0] ?? "64") * (agendaPanelCollapsedWidth.includes("rem") ? 16 : 1)}px`, // Example, ensure this aligns with your minMainPanelPixelWidth
              }}
            >
              {/* Views */}
              {currentView === "day" && (
                <DayView
                  currentDate={currentDate}
                  events={safeEvents}
                  onEventClick={handleEventClick}
                  onGridClick={handleGridClick}
                  userCalendars={userCalendars}
                />
              )}
              {currentView === "week" && (
                <WeekView
                  currentDate={currentDate}
                  events={safeEvents}
                  onEventClick={handleEventClick}
                  daysInWeek={daysInWeek}
                  setCurrentDate={setCurrentDate}
                  setCurrentView={setCurrentView}
                  onGridClick={handleGridClick}
                  userCalendars={userCalendars}
                />
              )}
              {currentView === "month" && (
                <MonthView
                  currentDate={currentDate}
                  events={safeEvents}
                  onEventClick={handleEventClick}
                  setCurrentDate={setCurrentDate}
                  setCurrentView={setCurrentView}
                />
              )}
            </main>

            {isAgendaPanelExpanded && (
              <div
                className={cn(
                  "group flex w-2.5 flex-shrink-0 cursor-col-resize items-center justify-center",
                  "bg-border/50 hover:bg-primary/30 transition-colors duration-150",
                  isResizing && "bg-primary/50",
                )}
                onMouseDown={isAgendaPanelExpanded ? startResizing : undefined}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize calendar and agenda panels"
                tabIndex={isAgendaPanelExpanded ? 0 : -1}
              >
                <GripVertical className="text-muted-foreground/70 group-hover:text-primary h-6 w-6 transition-colors duration-150" />
              </div>
            )}

            <AgendaPanel
              events={safeEvents}
              onEventClick={(event, target) => handleEventClick(event, target)}
              isExpanded={isAgendaPanelExpanded}
              togglePanel={toggleAgendaPanel}
              className={cn(
                "transition-all duration-300 ease-in-out",
                isAgendaPanelExpanded
                  ? `flex-auto ${agendaPanelExpandedWidth}`
                  : `flex-none ${agendaPanelCollapsedWidth}`,
              )}
            />
          </div>
        </div>

        {/* Popover for displaying and editing event details */}
        <EventDetailPopover
          event={selectedEvent}
          isOpen={isEventPopoverOpen}
          onOpenChange={setIsEventPopoverOpen}
          anchorRef={eventPopoverAnchorRef}
          onEventUpdated={() => {
            void utils.event.getAllByUser.invalidate();
          }}
          onEventDeleted={() => {
            void utils.event.getAllByUser.invalidate();
          }}
          userCalendars={userCalendars}
        />

        {/* Popover for creating event from grid click */}
        <Popover
          open={isGridCreatePopoverOpen}
          onOpenChange={setIsGridCreatePopoverOpen}
        >
          <PopoverAnchor
            virtualRef={
              gridCreatePopoverAnchorRef as
                | React.RefObject<HTMLElement>
                | undefined
            }
          />
          <PopoverContent
            side={gridCreatePopoverSide}
            align="start"
            sideOffset={10}
            className="bg-card text-card-foreground border-border/50 z-50 w-80 p-4 shadow-2xl md:w-96"
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-calendar-event-id]")) {
                e.preventDefault();
              }
            }}
          >
            {gridCreateDateTime && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-semibold">
                    Create Event
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsGridCreatePopoverOpen(false)}
                  >
                    <MenuIcon className="h-4 w-4" />
                  </Button>
                </div>
                <EventForm
                  defaultDate={gridCreateDateTime}
                  defaultStartTime={gridCreateDateTime}
                  onSave={(data) => {
                    createEventFromGridMutation.mutate({
                      ...data,
                      // Ensure default 1-hour duration if not explicitly set by form interaction (though form itself handles this)
                      endTime: data.endTime ?? addHours(data.startTime, 1),
                    });
                  }}
                  isSaving={createEventFromGridMutation.isPending}
                  onCancel={() => setIsGridCreatePopoverOpen(false)}
                  userCalendars={userCalendars}
                />
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Dialog for creating event from sidebar button */}
        <CreateEventDialog
          isOpen={isCreateEventDialogOpen}
          setIsOpen={setIsCreateEventDialogOpen}
          onEventCreated={() => {
            void utils.event.getAllByUser.invalidate();
          }}
          selectedDate={currentDate}
          userCalendars={userCalendars}
        />
      </div>
    </TooltipProvider>
  );
}
