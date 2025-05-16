import {
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  getTime,
  getHours,
  getMinutes,
  addDays,
  isSameDay,
} from "date-fns";
import type { RouterOutputs } from "~/trpc/react";

export type CalendarEvent = RouterOutputs["event"]["getAllByUser"][number];
export type UserCalendar = RouterOutputs["userCalendar"]["getAll"][number];

export const hourHeight = 64;
export const timeGutterWidthClass = "w-[4.5rem]";
export const timeGutterWidthPixels = 4.5 * 16;

export const sidebarCollapsedWidth = "w-16";
export const sidebarExpandedWidth = "md:w-64";
export const sidebarHoverWidth = "md:w-20";

export const chatPanelCollapsedWidth = "w-16";
export const chatPanelHoverWidth = "w-20";
export const chatPanelExpandedWidth = "md:w-120"; // Max width, resizable

export const colorOptions = [
  { value: "bg-blue-600", label: "Blue", twClass: "blue-600" },
  { value: "bg-green-600", label: "Green", twClass: "green-600" },
  { value: "bg-purple-600", label: "Purple", twClass: "purple-600" },
  { value: "bg-yellow-600", label: "Yellow", twClass: "yellow-600" },
  { value: "bg-red-600", label: "Red", twClass: "red-600" },
  { value: "bg-indigo-600", label: "Indigo", twClass: "indigo-600" },
  { value: "bg-pink-600", label: "Pink", twClass: "pink-600" },
  { value: "bg-teal-600", label: "Teal", twClass: "teal-600" },
  { value: "bg-gray-500", label: "Gray", twClass: "gray-500" },
];

export const getTextColorFromBg = (
  bgColor: string | undefined | null,
): string => {
  if (!bgColor) return "text-primary";
  return bgColor
    .replace("bg-", "text-")
    .replace("-600", "-100")
    .replace("-500", "-50");
};

export const calculateEventPositionAndHeightForDay = (
  event: CalendarEvent,
  dayOfColumn: Date,
  isMonthView = false,
): {
  top: number;
  height: number;
  position: "absolute";
  left: string;
  right: string;
  zIndex: number;
} => {
  if (isMonthView) {
    return {
      top: 0,
      height: 0,
      position: "absolute",
      left: "0",
      right: "0",
      zIndex: 10,
    };
  }

  const columnDayStart = startOfDay(dayOfColumn);
  const columnDayEnd = endOfDay(dayOfColumn);

  const effectiveStartTime = isAfter(event.startTime, columnDayStart)
    ? event.startTime
    : columnDayStart;
  const effectiveEndTime = isBefore(event.endTime, columnDayEnd)
    ? event.endTime
    : columnDayEnd;

  const startOffsetMinutes = differenceInMinutes(
    effectiveStartTime,
    columnDayStart,
  );

  let endOffsetMinutes = differenceInMinutes(effectiveEndTime, columnDayStart);

  if (
    getTime(effectiveEndTime) === getTime(columnDayEnd) ||
    (getHours(event.endTime) === 0 &&
      getMinutes(event.endTime) === 0 &&
      isSameDay(event.endTime, addDays(columnDayStart, 1)))
  ) {
    endOffsetMinutes = 24 * 60;
  }

  const top = (startOffsetMinutes / 60) * hourHeight;
  const durationMinutes = Math.max(15, endOffsetMinutes - startOffsetMinutes);
  const height = Math.max(hourHeight / 4, (durationMinutes / 60) * hourHeight);

  return {
    top: top,
    height: height,
    position: "absolute",
    left: "4px",
    right: "4px",
    zIndex: 10,
  };
};
