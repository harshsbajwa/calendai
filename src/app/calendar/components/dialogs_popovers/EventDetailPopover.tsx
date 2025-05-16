"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  Edit3,
  Trash2,
  XIcon,
} from "lucide-react";
import { api, type RouterInputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverClose,
} from "~/components/ui/popover";
import EventForm, { type EventFormData } from "./EventForm";
import type { CalendarEvent, UserCalendar } from "~/app/calendar/utils/utils";
import { motion, AnimatePresence } from "motion/react";

type EventUpdateData = RouterInputs["event"]["update"];

interface EventDetailPopoverProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
  userCalendars?: UserCalendar[];
  popoverSide?: "left" | "right" | "top" | "bottom";
}

const EventDetailPopover: React.FC<EventDetailPopoverProps> = ({
  event,
  isOpen,
  onOpenChange,
  anchorRef,
  onEventUpdated,
  onEventDeleted,
  userCalendars,
  popoverSide = "right",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setIsEditing(false);
        setFormError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!event && isOpen) {
      onOpenChange(false);
    }
  }, [event, isOpen, onOpenChange]);

  const updateEventMutation = api.event.update.useMutation({
    onSuccess: () => {
      onEventUpdated();
      setIsEditing(false);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error.message ?? "Failed to update event.");
    },
  });

  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      onEventDeleted();
      onOpenChange(false);
    },
    onError: (error) => {
      setFormError(error.message ?? "Failed to delete event.");
    },
  });

  const handleSaveEvent = (data: EventFormData & { id?: string }) => {
    if (!event || !data.id) {
      setFormError("Cannot update event: Missing event ID.");
      return;
    }
    const mutationData: EventUpdateData = {
      id: data.id,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      color: data.color,
      userCalendarId: data.userCalendarId,
    };
    updateEventMutation.mutate(mutationData);
  };

  const handleDeleteEvent = () => {
    if (!event) return;
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      deleteEventMutation.mutate({ id: event.id });
    }
  };

  const measurableAnchorRef = anchorRef?.current
    ? { current: anchorRef.current }
    : undefined;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      {measurableAnchorRef && (
        <PopoverAnchor
          virtualRef={measurableAnchorRef as React.RefObject<HTMLElement>}
        />
      )}
      <AnimatePresence>
        {isOpen && event && (
          <PopoverContent
            // @ts-expect-error PopoverContent doesn't expect motion props directly, but motion.custom works
            as={motion.div}
            custom={{ side: popoverSide }}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
              initial: (custom: { side: string }) => ({
                opacity: 0,
                scale: 0.95,
                x:
                  custom.side === "left"
                    ? 20
                    : custom.side === "right"
                      ? -20
                      : 0,
                y:
                  custom.side === "top"
                    ? 20
                    : custom.side === "bottom"
                      ? -20
                      : 0,
              }),
              animate: { opacity: 1, scale: 1, x: 0, y: 0 },
              exit: (custom: { side: string }) => ({
                opacity: 0,
                scale: 0.95,
                x:
                  custom.side === "left"
                    ? 20
                    : custom.side === "right"
                      ? -20
                      : 0,
                y:
                  custom.side === "top"
                    ? 20
                    : custom.side === "bottom"
                      ? -20
                      : 0,
              }),
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            side={popoverSide}
            align="start"
            sideOffset={10}
            className="text-card-foreground border-border/50 z-50 w-80 origin-center p-0 shadow-2xl md:w-96" // Removed bg-card
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-calendar-event-id]")) {
                e.preventDefault();
              }
            }}
          >
            {isEditing ? (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-semibold">
                    Edit Event
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsEditing(false)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <EventForm
                  event={event}
                  onSave={handleSaveEvent}
                  onCancel={() => setIsEditing(false)}
                  isSaving={updateEventMutation.isPending}
                  userCalendars={userCalendars}
                />
                {formError && (
                  <p className="pt-2 text-sm text-red-500 dark:text-red-400">
                    {formError}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "border-border/30 border-b p-4 pb-3",
                    event.color,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <h3
                      className={cn(
                        "mb-1 font-serif text-xl font-bold text-white",
                      )}
                    >
                      {event.title}
                    </h3>
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-1 -mr-1 h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </PopoverClose>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-white/80">
                    <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{format(event.startTime, "EEEE, MMMM d, yyyy")}</span>
                  </p>
                </div>

                <div className="text-foreground/90 space-y-3 p-4 text-sm">
                  <p className="flex items-start gap-2.5">
                    <Clock className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{`${format(event.startTime, "p")} - ${format(event.endTime, "p")}`}</span>
                  </p>
                  {event.location && (
                    <p className="flex items-start gap-2.5">
                      <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{event.location}</span>
                    </p>
                  )}
                  {Array.isArray(event.attendees) &&
                    event.attendees.length > 0 && (
                      <div className="flex items-start gap-2.5">
                        <Users className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Attendees
                          </p>
                          <p className="text-sm">
                            {(event.attendees as string[]).join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                  {event.description && (
                    <div className="flex items-start gap-2.5">
                      <span className="bg-muted-foreground/70 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"></span>
                      <p className="text-sm whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  )}
                </div>
                <div className="border-border/30 bg-muted/30 flex justify-end gap-2 border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="destructive-outline"
                    size="sm"
                    onClick={handleDeleteEvent}
                    disabled={deleteEventMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </>
            )}
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
};

export default EventDetailPopover;
