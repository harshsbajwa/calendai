"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Check, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { api } from "~/trpc/react";
import type { UserCalendar } from "~/app/calendar/utils/utils";
import { cn } from "~/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { colorOptions } from "~/app/calendar/utils/utils";

interface ManageCalendarsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCalendarsUpdate: () => void;
}

const ManageCalendarsDialog: React.FC<ManageCalendarsDialogProps> = ({
  isOpen,
  setIsOpen,
  onCalendarsUpdate,
}) => {
  const utils = api.useUtils();
  const { data: userCalendars, isLoading: isLoadingCalendars } =
    api.userCalendar.getAll.useQuery(undefined, {
      enabled: isOpen,
    });

  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState(
    colorOptions[0]?.value ?? "bg-blue-600",
  );
  const [editingCalendar, setEditingCalendar] = useState<UserCalendar | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.userCalendar.create.useMutation({
    onSuccess: () => {
      void utils.userCalendar.getAll.invalidate();
      onCalendarsUpdate();
      setNewCalendarName("");
      setNewCalendarColor(colorOptions[0]?.value ?? "bg-blue-600");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = api.userCalendar.update.useMutation({
    onSuccess: () => {
      void utils.userCalendar.getAll.invalidate();
      onCalendarsUpdate();
      setEditingCalendar(null);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = api.userCalendar.delete.useMutation({
    onSuccess: () => {
      void utils.userCalendar.getAll.invalidate();
      onCalendarsUpdate();
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const handleCreateCalendar = () => {
    if (!newCalendarName.trim()) {
      setError("Calendar name cannot be empty.");
      return;
    }
    createMutation.mutate({ name: newCalendarName, color: newCalendarColor });
  };

  const handleStartEdit = (calendar: UserCalendar) => {
    setEditingCalendar(calendar);
    setEditName(calendar.name);
    setEditColor(calendar.color);
    setError(null);
  };

  const handleSaveChanges = () => {
    if (!editingCalendar || !editName.trim()) {
      setError("Calendar name cannot be empty.");
      return;
    }
    updateMutation.mutate({
      id: editingCalendar.id,
      name: editName,
      color: editColor,
    });
  };

  const handleToggleVisibility = (calendar: UserCalendar) => {
    updateMutation.mutate({ id: calendar.id, isVisible: !calendar.isVisible });
  };

  const handleDeleteCalendar = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this calendar? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate({ id });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setEditingCalendar(null);
      setNewCalendarName("");
      setNewCalendarColor(colorOptions[0]?.value ?? "bg-blue-600");
      setError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-card text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Manage My Calendars
          </DialogTitle>
        </DialogHeader>
        <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-2">
          {isLoadingCalendars && <p>Loading calendars...</p>}
          {userCalendars?.map((cal) => (
            <div
              key={cal.id}
              className="hover:bg-accent/50 group flex items-center space-x-2 rounded-md p-2"
            >
              {editingCalendar?.id === cal.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-background dark:bg-input/30 h-8 flex-grow"
                    aria-label="Edit calendar name"
                  />
                  <ColorPickerPopover
                    selectedColor={editColor}
                    onColorSelect={setEditColor}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-600"
                    onClick={handleSaveChanges}
                    aria-label="Save changes"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                    onClick={() => setEditingCalendar(null)}
                    aria-label="Cancel edit"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Checkbox
                    id={`cal-vis-${cal.id}`}
                    checked={cal.isVisible}
                    onCheckedChange={() => handleToggleVisibility(cal)}
                    className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                    aria-label={`Toggle visibility for ${cal.name}`}
                  />
                  <div
                    className={cn(
                      "h-3 w-3 flex-shrink-0 rounded-sm",
                      cal.color,
                    )}
                  />
                  <Label
                    htmlFor={`cal-vis-${cal.id}`}
                    className="text-foreground/90 flex-grow cursor-pointer truncate text-sm font-normal"
                  >
                    {cal.name}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleStartEdit(cal)}
                    aria-label="Edit calendar"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive/70 hover:text-destructive h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDeleteCalendar(cal.id)}
                    aria-label="Delete calendar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}

          <div className="border-border/50 border-t pt-4">
            <h4 className="mb-2 text-sm font-medium">Create New Calendar</h4>
            <div className="flex items-center space-x-2">
              <Input
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder="New calendar name"
                className="bg-background dark:bg-input/30 h-9 flex-grow"
                aria-label="New calendar name"
              />
              <ColorPickerPopover
                selectedColor={newCalendarColor}
                onColorSelect={setNewCalendarColor}
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateCalendar}
                disabled={createMutation.isPending || !newCalendarName.trim()}
                className="h-9"
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          {error && (
            <p className="pt-1 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ColorPickerPopover: React.FC<{
  selectedColor: string;
  onColorSelect: (color: string) => void;
}> = ({ selectedColor, onColorSelect }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Select color"
        >
          <div className={cn("h-4 w-4 rounded-sm", selectedColor)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover w-auto p-2">
        <div className="grid grid-cols-5 gap-1">
          {colorOptions.map((color) => (
            <Button
              key={color.value}
              variant="outline"
              size="icon"
              className={cn(
                "h-7 w-7",
                selectedColor === color.value && "ring-ring ring-2",
              )}
              onClick={() => onColorSelect(color.value)}
              aria-label={color.label}
            >
              <div className={cn("h-4 w-4 rounded-sm", color.value)} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ManageCalendarsDialog;
