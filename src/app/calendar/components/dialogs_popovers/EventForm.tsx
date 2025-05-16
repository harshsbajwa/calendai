"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, parse, add, isAfter, parseISO, isValid } from "date-fns";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { CalendarEvent, UserCalendar } from "~/app/calendar/utils/utils";
import { colorOptions } from "~/app/calendar/utils/utils";

export type EventFormData = {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  userCalendarId?: string;
};

interface EventFormProps {
  event?: CalendarEvent | null;
  defaultDate?: Date;
  defaultStartTime?: Date;
  onSave: (data: EventFormData & { id?: string }) => void;
  onCancel?: () => void;
  isSaving: boolean;
  saveButtonText?: string;
  userCalendars?: UserCalendar[];
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  defaultDate,
  defaultStartTime,
  onSave,
  onCancel,
  isSaving,
  saveButtonText = event ? "Save Changes" : "Create Event",
  userCalendars = [],
}) => {
  const initialDate = useMemo(
    () =>
      format(
        defaultStartTime ?? event?.startTime ?? defaultDate ?? new Date(),
        "yyyy-MM-dd",
      ),
    [event, defaultDate, defaultStartTime],
  );
  const initialStartTimeStr = useMemo(() => {
    const baseTime = defaultStartTime ?? event?.startTime ?? new Date();
    const roundedTime = add(baseTime, { minutes: 0 });
    return format(roundedTime, "HH:mm");
  }, [event, defaultStartTime]);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [startDateString, setStartDateString] = useState<string>(initialDate);
  const [startTime, setStartTime] = useState(initialStartTimeStr);
  const [endTime, setEndTime] = useState(() =>
    format(
      event?.endTime ??
        add(parse(initialStartTimeStr, "HH:mm", parseISO(initialDate)), {
          hours: 1,
        }),
      "HH:mm",
    ),
  );
  const [selectedColor, setSelectedColor] = useState(
    event?.color ?? colorOptions[0]?.value ?? "bg-blue-600",
  );
  const [selectedUserCalendarId, setSelectedUserCalendarId] = useState<
    string | undefined
  >(event?.userCalendarId ?? userCalendars?.[0]?.id);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setStartDateString(format(event.startTime, "yyyy-MM-dd"));
      setStartTime(format(event.startTime, "HH:mm"));
      setEndTime(format(event.endTime, "HH:mm"));
      setSelectedColor(event.color ?? colorOptions[0]?.value ?? "bg-blue-600");
      setSelectedUserCalendarId(event.userCalendarId ?? userCalendars?.[0]?.id);
    } else if (defaultDate || defaultStartTime) {
      const baseDate = defaultStartTime ?? defaultDate ?? new Date();
      setStartDateString(format(baseDate, "yyyy-MM-dd"));
      const baseTime =
        defaultStartTime ??
        add(baseDate, {
          hours: new Date().getHours(),
          minutes: new Date().getMinutes(),
        }); // Use current time if only date given
      const sTime = format(baseTime, "HH:mm");
      setStartTime(sTime);
      setEndTime(
        format(add(parse(sTime, "HH:mm", baseDate), { hours: 1 }), "HH:mm"),
      );
      setTitle("");
      // Reset other fields if needed
      setDescription("");
      setLocation("");
      setSelectedColor(colorOptions[0]?.value ?? "bg-blue-600");
      setSelectedUserCalendarId(userCalendars?.[0]?.id);
    }
  }, [event, defaultDate, defaultStartTime, userCalendars]);

  useEffect(() => {
    try {
      const parsedStartDate = parseISO(startDateString);
      if (!isValid(parsedStartDate)) {
        return; // Don't proceed if date string is invalid
      }
      const parsedStartTime = parse(startTime, "HH:mm", parsedStartDate);
      const parsedEndTime = parse(endTime, "HH:mm", parsedStartDate);

      if (!isValid(parsedStartTime) || !isValid(parsedEndTime)) {
        return; // Don't proceed if time strings are invalid
      }

      if (!isAfter(parsedEndTime, parsedStartTime)) {
        setEndTime(format(add(parsedStartTime, { hours: 1 }), "HH:mm"));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      /* Silently catch parsing errors during input */
    }
  }, [startTime, endTime, startDateString]);

  const getCombinedDateTime = (
    dateStr: string,
    timeStr: string,
  ): Date | null => {
    if (!dateStr || !timeStr) return null;
    try {
      const isoDateTimeStr = `${dateStr}T${timeStr.includes(":") ? timeStr : timeStr + ":00"}`;
      const dt = parseISO(isoDateTimeStr);
      return isNaN(dt.getTime()) ? null : dt;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Event title is required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateString)) {
      setFormError("Invalid date format (YYYY-MM-DD).");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      setFormError("Invalid time format (HH:MM).");
      return;
    }

    const finalStartTime = getCombinedDateTime(startDateString, startTime);
    const finalEndTime = getCombinedDateTime(startDateString, endTime);

    if (!finalStartTime || !finalEndTime) {
      setFormError(
        "Invalid date or time value. Please ensure date and time are correctly entered.",
      );
      return;
    }
    if (!isAfter(finalEndTime, finalStartTime)) {
      setFormError("End time must be after start time.");
      return;
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: finalStartTime,
      endTime: finalEndTime,
      color: selectedColor,
      userCalendarId: selectedUserCalendarId ?? undefined,
    };

    onSave(event ? { ...eventData, id: event.id } : eventData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-title">
          Event Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Project Sync"
          required
          className="bg-background dark:bg-input/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="event-date">Date</Label>
          <Input
            type="date"
            id="event-date"
            value={startDateString}
            onChange={(e) => setStartDateString(e.target.value)}
            required
            className="bg-background dark:bg-input/30 w-full dark:[color-scheme:dark]"
          />
        </div>
        {userCalendars && userCalendars.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="event-user-calendar">Calendar</Label>
            <Select
              value={selectedUserCalendarId}
              onValueChange={setSelectedUserCalendarId}
            >
              <SelectTrigger
                id="event-user-calendar"
                className="bg-background dark:bg-input/30 w-full"
              >
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {userCalendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-3 w-3 rounded-sm", cal.color)} />
                      <span>{cal.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start-time">Start Time</Label>
          <Input
            type="time"
            id="start-time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="bg-background dark:bg-input/30 dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end-time">End Time</Label>
          <Input
            type="time"
            id="end-time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="bg-background dark:bg-input/30 dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Conference Room B / Zoom Link"
          className="bg-background dark:bg-input/30"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-description">Description</Label>
        <Input
          as="textarea"
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details about the event"
          className="bg-background dark:bg-input/30 h-20 resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-color">Color Tag</Label>
        <Select value={selectedColor} onValueChange={setSelectedColor}>
          <SelectTrigger
            id="event-color"
            className="bg-background dark:bg-input/30"
          >
            <SelectValue>
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-sm", selectedColor)}></div>
                <span className="capitalize">
                  {colorOptions.find((c) => c.value === selectedColor)?.label ??
                    selectedColor.replace("bg-", "").replace("-600", "")}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground">
            {colorOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-sm ${c.value}`}></div>
                  <span>{c.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formError && (
        <p className="pt-1 text-sm text-red-500 dark:text-red-400">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSaving} className="min-w-[120px]">
          {isSaving ? (
            <>
              <svg
                className="mr-3 -ml-1 h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </>
          ) : (
            saveButtonText
          )}
        </Button>
      </div>
    </form>
  );
};

export default EventForm;
