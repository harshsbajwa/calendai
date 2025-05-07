"use client";

import React, { useState, useEffect } from "react";
import { getHours, getMinutes } from "date-fns";

interface CurrentTimeIndicatorProps {
  hourHeight: number;
  timeGutterWidthValue: string;
}

const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  hourHeight,
  timeGutterWidthValue,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timerId);
  }, []);

  const currentMinute = getHours(currentTime) * 60 + getMinutes(currentTime);
  const topPosition = (currentMinute / 60) * hourHeight;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: `${topPosition}px`, left: timeGutterWidthValue }}
    >
      <div className="h-px w-full bg-red-500"></div> {/* Line */}
      <div
        className="border-background absolute h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-red-500"
        style={{ left: `-${parseFloat(timeGutterWidthValue) ? 6 : 0}px` }}
      ></div>
    </div>
  );
};

export default CurrentTimeIndicator;
