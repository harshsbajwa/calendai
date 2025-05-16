"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { Search as SearchIconCmd, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import type { CalendarEvent } from "../utils/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onEventSelect: (event: CalendarEvent, target: HTMLElement) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  setIsOpen,
  onEventSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: searchResults, isLoading } = api.event.search.useQuery(
    { query: debouncedSearchTerm },
    { enabled: debouncedSearchTerm.length > 0 && isOpen },
  );

  const allResults = useMemo(() => {
    const events = searchResults ?? [];
    return events;
  }, [searchResults]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || allResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + allResults.length) % allResults.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedItem = allResults[activeIndex];
        if (selectedItem) {
          onEventSelect(selectedItem, e.target as HTMLElement);
          setIsOpen(false);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, allResults, activeIndex, onEventSelect, setIsOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const activeElement = document.querySelector(
      `[data-result-index="${activeIndex}"]`,
    );
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="text-card-foreground top-[20%] translate-y-[-20%] p-0 sm:max-w-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-border border-b p-4">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <DialogDescription className="sr-only">Search for events or type commands.</DialogDescription>
          <div className="relative flex items-center">
            <SearchIconCmd className="text-muted-foreground absolute left-3 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search events or type commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-md border-0 bg-transparent pl-10 text-base shadow-none focus:ring-0"
              autoFocus
            />
          </div>
        </DialogHeader>
        <div className="custom-scrollbar max-h-[50vh] overflow-y-auto p-2">
          {isLoading && debouncedSearchTerm.length > 0 && (
            <p className="text-muted-foreground p-4 text-center">
              Searching...
            </p>
          )}
          {!isLoading &&
            debouncedSearchTerm.length > 0 &&
            allResults.length === 0 && (
              <p className="text-muted-foreground p-4 text-center">
                No results found.
              </p>
            )}
          {allResults.length > 0 && (
            <ul className="space-y-1">
              {allResults.map((item, index) => (
                <li key={item.id || index}>
                  <button
                    data-result-index={index}
                    className={cn(
                      "hover:bg-accent flex w-full flex-col items-start gap-1 rounded-md p-3 text-left",
                      index === activeIndex && "bg-accent ring-primary ring-2",
                    )}
                    onClick={(e) => {
                      onEventSelect(item, e.currentTarget);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar
                          className={cn(
                            "h-4 w-4",
                            item.color
                              ? item.color?.replace("bg-", "text-")
                              : "text-primary",
                          )}
                        />
                        <span className="text-foreground text-sm font-medium">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {format(item.startTime, "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {format(item.startTime, "p")} -{" "}
                        {format(item.endTime, "p")}
                      </p>
                      {item.location && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> {item.location}
                        </p>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground/80 mt-1 line-clamp-1 pl-6 text-xs">
                        {item.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {debouncedSearchTerm.length === 0 && !isLoading && (
            <p className="text-muted-foreground p-4 text-center">
              Start typing to search your events.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;