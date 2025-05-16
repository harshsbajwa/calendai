"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  User as UserIcon,
  LogOut,
  Settings,
  Search as SearchIcon,
  ChevronDown,
  GripVertical,
  XIcon,
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
  setHours,
  addMinutes,
} from "date-fns";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useMediaQuery } from "~/app/calendar/hooks/useMediaQuery";

import { Button } from "~/components/ui/button";
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
import CommandPalette from "./components/CommandPalette";


import {
  agendaPanelCollapsedWidth,
  type CalendarEvent,
  type UserCalendar as UserCalendarType,
} from "./utils/utils";
import { useResizablePanels } from "./hooks/useResizablePanels";


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

const DEMO_EVENTS: CalendarEvent[] = [
    { id: 'demo1', title: 'Team Standup', startTime: setHours(startOfDay(new Date()), 9), endTime: addMinutes(setHours(startOfDay(new Date()), 9), 30), color: 'bg-blue-600', userId: 'demo', createdAt: new Date(), updatedAt: new Date(), description: 'Daily team sync meeting.', location: 'Zoom', attendees: ['Alice', 'Bob'], userCalendarId: 'demoCal' },
    { id: 'demo2', title: 'Project Alpha Review', startTime: setHours(startOfDay(new Date()), 14), endTime: addMinutes(setHours(startOfDay(new Date()), 14), 90), color: 'bg-green-600', userId: 'demo', createdAt: new Date(), updatedAt: new Date(), description: 'Review progress on Project Alpha.', location: 'Conference Room 3', attendees: ['Charlie', 'Dave', 'Eve'], userCalendarId: 'demoCal' },
    { id: 'demo3', title: 'Client Call - Acme Corp', startTime: addDays(setHours(startOfDay(new Date()), 11), 1), endTime: addMinutes(addDays(setHours(startOfDay(new Date()), 11), 1), 60), color: 'bg-purple-600', userId: 'demo', createdAt: new Date(), updatedAt: new Date(), description: 'Discuss new requirements.', location: 'Google Meet', attendees: null, userCalendarId: 'demoCal' },
    { id: 'demo4', title: 'Gym Session', startTime: addDays(setHours(startOfDay(new Date()), 18), -1), endTime: addMinutes(addDays(setHours(startOfDay(new Date()), 18), -1), 60), color: 'bg-yellow-600', userId: 'demo', createdAt: new Date(), updatedAt: new Date(), description: null, location: null, attendees: [], userCalendarId: 'demoCal' },
    { id: 'demo5', title: 'Dentist Appointment', startTime: addDays(setHours(startOfDay(new Date()), 10), 2), endTime: addMinutes(addDays(setHours(startOfDay(new Date()), 10), 2), 45), color: 'bg-red-600', userId: 'demo', createdAt: new Date(), updatedAt: new Date(), description: null, location: "Dr. Smith's Office", attendees: null, userCalendarId: 'demoCal' },
];

const DEMO_USER_CALENDARS: UserCalendarType[] = [
    {id: 'demoCal', name: 'My Demo Calendar', color: 'bg-blue-600', isVisible: true, userId:'demo', createdAt: new Date(), updatedAt: new Date()}
];

const SkeletonPlaceholder: React.FC<{ className?: string; count?: number }> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md bg-muted/50 dark:bg-muted/30", className)}
        />
      ))}
    </>
  );
};

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
  const [eventPopoverSide, setEventPopoverSide] = useState<"left" | "right" | "top" | "bottom">("right");


  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);

  const [isGridCreatePopoverOpen, setIsGridCreatePopoverOpen] = useState(false);
  const [gridCreateDateTime, setGridCreateDateTime] = useState<Date | null>(
    null,
  );
  const gridCreatePopoverAnchorRef = useRef<HTMLElement | null>(null);
  const [gridCreatePopoverSide, setGridCreatePopoverSide] = useState<"left" | "right" | "top" | "bottom">("right");
  const [gridCreatePopoverAlign, setGridCreatePopoverAlign] = useState<"start" | "center" | "end">("start");


  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isAgendaPanelExpanded, setIsAgendaPanelExpanded] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [temporaryEvent, setTemporaryEvent] = useState<Partial<CalendarEvent> | null>(null);


  const { data: sessionData, status: sessionStatus } = useSession();
  const utils = api.useUtils();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemoMode = searchParams?.get("viewMode") === "demo";
  const isDesktop = useMediaQuery("(min-width: 768px)");


  const { data: userCalendarsData } = api.userCalendar.getAll.useQuery(undefined, {
    enabled: sessionStatus === "authenticated" && !isDemoMode,
  });
  const userCalendars = isDemoMode ? DEMO_USER_CALENDARS : userCalendarsData;

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
    data: fetchedEvents,
    isLoading: isLoadingEventsInitial,
  } = api.event.getAllByUser.useQuery(
    {
      startDate: viewDateRange.start,
      endDate: viewDateRange.end,
      userCalendarIds: selectedCalendarIds,
    },
    {
      enabled: (sessionStatus === "authenticated" || isDemoMode) && selectedCalendarIds.length > 0,
      placeholderData: (prev) => prev,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000,
    },
  );
  const events = isDemoMode ? DEMO_EVENTS : fetchedEvents;
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
          if (isGridCreatePopoverOpen) setIsGridCreatePopoverOpen(false);
          else if (isEventPopoverOpen) setIsEventPopoverOpen(false);
          else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
          else if (isCreateEventDialogOpen) setIsCreateEventDialogOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGridCreatePopoverOpen, isEventPopoverOpen, isCommandPaletteOpen, isCreateEventDialogOpen]);


  const determinePopoverPosition = (target: HTMLElement, popoverWidth: number, popoverHeight: number) => {
      const targetRect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const spaceRight = viewportWidth - targetRect.right;
      const spaceLeft = targetRect.left;
      const spaceBottom = viewportHeight - targetRect.bottom;
      const spaceTop = targetRect.top;

      let side: "left" | "right" | "top" | "bottom" = "right";
      let align: "start" | "center" | "end" = "start";

      if (spaceRight >= popoverWidth + 10) side = "right";
      else if (spaceLeft >= popoverWidth + 10) side = "left";
      else if (spaceBottom >= popoverHeight + 10) {
        side = "bottom";
        if (targetRect.left + targetRect.width / 2 < popoverWidth / 2) align = "start";
        else if (viewportWidth - (targetRect.left + targetRect.width / 2) < popoverWidth / 2) align = "end";
        else align = "center";
      } else if (spaceTop >= popoverHeight + 10) {
        side = "top";
        if (targetRect.left + targetRect.width / 2 < popoverWidth / 2) align = "start";
        else if (viewportWidth - (targetRect.left + targetRect.width / 2) < popoverWidth / 2) align = "end";
        else align = "center";
      } else {
        if (spaceRight > spaceLeft) side = "right"; else side = "left";
        if (spaceBottom < popoverHeight && spaceTop < popoverHeight) {
            if (targetRect.bottom < viewportHeight / 2) side = "bottom"; else side = "top";
        }
      }
      return { side, align };
  };


  const handleEventClick = useCallback(
    (event: CalendarEvent, target: HTMLElement) => {
      setSelectedEvent(event);
      eventPopoverAnchorRef.current = target;
      const {side} = determinePopoverPosition(target, 384, 400); // Approx. Popover width & height
      setEventPopoverSide(side);
      setIsEventPopoverOpen(true);
      setIsGridCreatePopoverOpen(false);
      setTemporaryEvent(null);
    },
    [],
  );

 const clearTemporaryEvent = useCallback(() => setTemporaryEvent(null), []);

  const handleGridClick = useCallback((dateTime: Date, target: HTMLElement) => {
    if (!isDesktop) {
      setIsCreateEventDialogOpen(true);
      setCurrentDate(dateTime);
      clearTemporaryEvent();
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempStartTime = dateTime;
    const tempEndTime = addHours(dateTime, 1);
    setTemporaryEvent({
        id: tempId,
        startTime: tempStartTime,
        endTime: tempEndTime,
        title: "New Event",
        color: "bg-gray-400/70",
    });

    setGridCreateDateTime(dateTime);
    gridCreatePopoverAnchorRef.current = target;
    const { side, align } = determinePopoverPosition(target, 384, 550); // Approx. Popover width & height
    setGridCreatePopoverSide(side);
    setGridCreatePopoverAlign(align);

    setIsGridCreatePopoverOpen(true);
    setIsEventPopoverOpen(false);
    setSelectedEvent(null);
  }, [isDesktop, clearTemporaryEvent]);

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
    if (!isGridCreatePopoverOpen && temporaryEvent) {
       clearTemporaryEvent();
    }
  }, [isGridCreatePopoverOpen, temporaryEvent, clearTemporaryEvent]);

  const createEventFromGridMutation = api.event.create.useMutation({
    onSuccess: () => {
      void utils.event.getAllByUser.invalidate();
      setIsGridCreatePopoverOpen(false);
      clearTemporaryEvent();
    },
    onError: (error) => {
      alert(`Failed to create event: ${error.message}`);
      console.error("Create Event from Grid Error:", error);
    },
  });

  const initialExpandedAgendaWidthPx = 320;
  const minExpandedAgendaWidthPx = 240;

  const {
    mainPanelStyle,
    sidePanelStyle,
    startResizing,
    containerRef: resizableContainerRef,
    isResizing,
  } = useResizablePanels(
    75,
    300,
    minExpandedAgendaWidthPx,
    initialExpandedAgendaWidthPx
  );

  useEffect(() => {
    if (sessionStatus === "unauthenticated" && !isDemoMode) {
      router.push("/api/auth/signin");
    }
  }, [sessionStatus, isDemoMode, router]);

  if (!isMounted || (sessionStatus === "loading" && !isDemoMode)) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
            <div className="flex flex-col items-center gap-4">
                <SkeletonPlaceholder className="h-12 w-12 rounded-full" />
                <SkeletonPlaceholder className="h-4 w-48" />
                <SkeletonPlaceholder className="h-4 w-32" />
            </div>
        </div>
    );
  }

  if (sessionStatus === "unauthenticated" && !isDemoMode) {
    return <RedirectToSignIn />;
  }

  return (
    <TooltipProvider>
      <div className="bg-transparent text-foreground flex h-full w-full overflow-hidden relative z-10">
        <Sidebar
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onOpenCreateDialog={() => {
              clearTemporaryEvent();
              setIsCreateEventDialogOpen(true);
          }}
          onEventClick={handleEventClick}
          isExpanded={isSidebarExpanded}
          toggleSidebar={toggleSidebar}
          selectedCalendarIds={selectedCalendarIds}
          setSelectedCalendarIds={setSelectedCalendarIds}
          className="hidden md:flex"
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              "relative z-30 flex h-16 flex-shrink-0 items-center justify-between border-b px-4 py-2 shadow-sm",
              "border-white/10 dark:border-black/20",
              "bg-transparent backdrop-blur-[var(--blur-intensity-strong)]"
            )}
          >
            {/* Left Group */}
            <div className="flex items-center gap-2">
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
                <SheetContent side="left" className="w-72 p-0 bg-transparent backdrop-blur-md border-r border-white/10 dark:border-black/20">
                  <SidebarContent
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onOpenCreateDialog={() => {
                      clearTemporaryEvent();
                      setIsCreateEventDialogOpen(true);
                    }}
                    onEventClick={handleEventClick}
                    isExpanded={true}
                    toggleSidebar={() => {}}
                    isMobile={true}
                    className="h-full border-r-0 shadow-none bg-transparent"
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
                      "hidden px-3 py-4 md:inline-flex",
                      sharedGradientButtonStyle,
                      "bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-sm",
                      "border-border border"
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
                      className="h-8 w-8 rounded-none rounded-l-md border-0 border-r bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-sm"
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
                      className="h-8 w-8 rounded-none rounded-r-md border-0 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-sm"
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
            </div>

            {/* Center Group (Date) */}
            <div className="flex-grow px-2 text-center">
              <h2 className="text-foreground truncate font-serif text-lg font-medium md:text-xl">
                {format(
                  currentDate,
                  currentView === "month" ? "MMMM yyyy" : "MMMM d, yyyy",
                )}
              </h2>
            </div>
            
            {/* Right Group */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "group w-20 justify-between capitalize md:w-24",
                      sharedGradientButtonStyle,
                       "bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-sm"
                    )}
                    aria-label={`Current view: ${currentView}. Change view.`}
                  >
                    {currentView}
                    <ChevronDown className="ml-1 h-4 w-4 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32 bg-popover/80 backdrop-blur-md dark:bg-dark-popover/80">
                  <DropdownMenuItem
                    onClick={() => handleToggleView("day")}
                    className={cn(
                      currentView === "day" && "bg-accent/50 dark:bg-accent/30 font-semibold",
                    )}
                  >
                    Day
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleView("week")}
                    className={cn(
                      currentView === "week" && "bg-accent/50 dark:bg-accent/30 font-semibold",
                    )}
                  >
                    Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleView("month")}
                    className={cn(
                      currentView === "month" && "bg-accent/50 dark:bg-accent/30 font-semibold",
                    )}
                  >
                    Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 backdrop-blur-sm"
                      onClick={() => setIsCommandPaletteOpen(true)}
                      aria-label="Open command palette (Cmd+K)"
                  >
                      <SearchIcon className="h-4 w-4" />
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                  <p>Search / Commands (⌘K)</p>
                  </TooltipContent>
              </Tooltip>

              <div className="md:hidden">
                <ThemeToggle />
              </div>
              {!isDemoMode && sessionData?.user && (<div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                      aria-label="Open user menu"
                    >
                      {sessionData.user.image ? (
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
                  <DropdownMenuContent align="end" className="w-56 bg-popover/80 backdrop-blur-md dark:bg-dark-popover/80">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {sessionData.user.name ?? "Account"}
                        </p>
                        <p className="text-muted-foreground text-xs leading-none">
                          {sessionData.user.email}
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
              </div>)}
            </div>
          </header>

          <div
            ref={resizableContainerRef}
            className="flex flex-1 overflow-hidden"
          >
            <main
              className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto p-1 pb-2 md:p-2 lg:p-3"
              style={mainPanelStyle}
            >
            { (isLoadingEventsInitial && !isDemoMode && (!fetchedEvents || fetchedEvents.length === 0)) ? (
                <div className="flex h-full flex-col">
                    {currentView !== 'month' && <SkeletonPlaceholder className="h-16 w-full mb-2" />}
                    <div className="grid grid-cols-1 md:grid-cols-7 flex-1 gap-px">
                        {Array.from({length: currentView === 'day' ? 1 : 7}).map((_, i) => (
                            <div key={i} className="p-2 space-y-2">
                                <SkeletonPlaceholder className="h-8 w-full" />
                                <SkeletonPlaceholder className="h-20 w-full" />
                                <SkeletonPlaceholder className="h-12 w-full" />
                                <SkeletonPlaceholder className="h-16 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
              <>
                {currentView === "day" && (
                    <DayView
                    currentDate={currentDate}
                    events={safeEvents}
                    onEventClick={handleEventClick}
                    onGridClick={handleGridClick}
                    temporaryEvent={temporaryEvent}
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
                    temporaryEvent={temporaryEvent}
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
              </>
            )}
            </main>

            {isDesktop && (
              <div
                className={cn(
                  "group flex w-2.5 flex-shrink-0 cursor-col-resize items-center justify-center",
                  "bg-transparent hover:bg-primary/20 transition-colors duration-150",
                  isResizing && "bg-primary/30",
                  !isAgendaPanelExpanded && "hidden" 
                )}
                onMouseDown={startResizing}
                onTouchStart={startResizing}
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
                onEventClick={handleEventClick}
                isExpanded={isAgendaPanelExpanded}
                togglePanel={toggleAgendaPanel}
                style={isDesktop && isAgendaPanelExpanded ? sidePanelStyle : undefined}
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    isDesktop
                      ? (isAgendaPanelExpanded
                          ? 'flex-none' 
                          : `flex-none ${agendaPanelCollapsedWidth}`)
                      : 'hidden'
                )}
                isLoadingEvents={isLoadingEventsInitial && !isDemoMode && (!fetchedEvents || fetchedEvents.length === 0)}
            />
          </div>
        </div>
      </div>

      <EventDetailPopover
        event={selectedEvent}
        isOpen={isEventPopoverOpen}
        onOpenChange={setIsEventPopoverOpen}
        anchorRef={eventPopoverAnchorRef}
        onEventUpdated={() => {
          if(!isDemoMode) void utils.event.getAllByUser.invalidate();
        }}
        onEventDeleted={() => {
          if(!isDemoMode) void utils.event.getAllByUser.invalidate();
        }}
        userCalendars={userCalendars}
        popoverSide={eventPopoverSide}
      />

      <Popover
        open={isGridCreatePopoverOpen}
        onOpenChange={(open) => {
            setIsGridCreatePopoverOpen(open);
            if (!open) clearTemporaryEvent();
        }}
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
          align={gridCreatePopoverAlign}
          sideOffset={10}
          collisionPadding={10}
          className="bg-popover/80 dark:bg-dark-popover/80 text-popover-foreground dark:text-dark-popover-foreground border-white/10 dark:border-black/20 z-50 w-80 p-0 shadow-2xl md:w-96 backdrop-blur-md"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-calendar-event-id^='temp-']")) {
                e.preventDefault();
                return;
            }
            if (target.closest("[data-calendar-event-id]:not([data-calendar-event-id^='temp-'])")) {
              e.preventDefault(); // Prevent closing if clicking on another event while this popover is open
              return;
            }
            setIsGridCreatePopoverOpen(false);
            clearTemporaryEvent();
          }}

        >
          {gridCreateDateTime && (
            <>
              <div className="border-white/10 dark:border-black/20 border-b px-6 pt-6 pb-3 flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold">
                  Create Event
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                      setIsGridCreatePopoverOpen(false);
                      clearTemporaryEvent();
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6">
              <EventForm
                defaultDate={gridCreateDateTime}
                defaultStartTime={gridCreateDateTime}
                onSave={(data) => {
                  clearTemporaryEvent();
                  if(isDemoMode) {
                      alert("Demo mode: Event creation is not saved.");
                      setIsGridCreatePopoverOpen(false);
                      return;
                  }
                  createEventFromGridMutation.mutate({
                    ...data,
                    endTime: data.endTime ?? addHours(data.startTime, 1), // Ensure endTime is always provided
                  });
                }}
                isSaving={createEventFromGridMutation.isPending}
                onCancel={() => {
                    clearTemporaryEvent();
                    setIsGridCreatePopoverOpen(false);
                }}
                userCalendars={userCalendars}
              />
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <CreateEventDialog
        isOpen={isCreateEventDialogOpen}
        setIsOpen={(open) => {
            if (!open) clearTemporaryEvent();
            setIsCreateEventDialogOpen(open);
        }}
        onEventCreated={() => {
          clearTemporaryEvent();
          if(!isDemoMode) void utils.event.getAllByUser.invalidate();
          else alert("Demo mode: Event creation is not saved.");
        }}
        selectedDate={currentDate}
        userCalendars={userCalendars}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
        onEventSelect={(event, target) => {
           handleEventClick(event, target || document.body); 
        }}
      />
    </TooltipProvider>
  );
}