"use client";

import React, { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import EventForm, { type EventFormData } from "./EventForm";
import type { UserCalendar } from "~/app/calendar/utils/utils";

interface CreateEventDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onEventCreated: () => unknown;
  selectedDate?: Date; // Can be used to pre-fill date
  userCalendars?: UserCalendar[];
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  setIsOpen,
  onEventCreated,
  selectedDate,
  userCalendars,
}) => {
  const [formError, setFormError] = useState<string | null>(null);

  const createEventMutation = api.event.create.useMutation({
    onSuccess: () => {
      onEventCreated();
      setIsOpen(false);
      setFormError(null);
    },
    onError: (error) => {
      if (error.data?.zodError?.fieldErrors) {
        const messages = Object.entries(error.data.zodError.fieldErrors)
          .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
          .join("; ");
        setFormError(`Invalid input: ${messages}`);
      } else {
        setFormError(
          error.message ?? "Failed to create event. Please try again.",
        );
      }
      console.error("Create Event Error:", error);
    },
  });

  const handleSaveEvent = (data: EventFormData) => {
    createEventMutation.mutate(data);
  };

  // Reset form error when dialog closes or opens
  useEffect(() => {
    if (!isOpen) setFormError(null);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-card text-card-foreground p-0 sm:max-w-lg">
        <DialogHeader className="border-border border-b px-6 pt-6 pb-3">
          <DialogTitle className="text-center font-sans text-xl font-bold">
            Create New Event
          </DialogTitle>
        </DialogHeader>
        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto p-6">
          <EventForm
            defaultDate={selectedDate}
            onSave={handleSaveEvent}
            onCancel={() => setIsOpen(false)}
            isSaving={createEventMutation.isPending}
            saveButtonText="Create Event"
            userCalendars={userCalendars}
          />
          {formError && (
            <p className="pt-2 text-center text-sm text-red-500 dark:text-red-400">
              {formError}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
