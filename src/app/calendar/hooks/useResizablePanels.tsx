import { useState, useCallback, useEffect, useRef } from "react";
import { agendaPanelCollapsedWidth } from "~/app/calendar/utils/utils";

const agendaCollapsedWidthPixels =
  parseInt(agendaPanelCollapsedWidth.replace("w-", "")) * 4;

export function useResizablePanels(
  initialMainPanelWidthPercent = 60,
  minMainPanelPixelWidth = 300,
  minSidePanelPixelWidth = agendaCollapsedWidthPixels,
  initialSidePanelExpandedWidth = 288,
) {
  const [mainPanelFlexBasis, setMainPanelFlexBasis] = useState<string>(
    `${initialMainPanelWidthPercent}%`,
  );
  const [sidePanelFlexBasis, setSidePanelFlexBasis] = useState<string>(
    `${initialSidePanelExpandedWidth}px`,
  );
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startResizing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e) {
      } else {
        e.preventDefault();
      }
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  const stopResizing = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isResizing]);

  const resize = useCallback(
    (clientX: number) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const resizerWidth = 8;

      let newMainPanelAbsoluteWidth =
        clientX - containerRect.left - resizerWidth / 2;

      newMainPanelAbsoluteWidth = Math.max(
        minMainPanelPixelWidth,
        newMainPanelAbsoluteWidth,
      );
      newMainPanelAbsoluteWidth = Math.min(
        containerRect.width - minSidePanelPixelWidth - resizerWidth,
        newMainPanelAbsoluteWidth,
      );

      const newSidePanelAbsoluteWidth =
        containerRect.width - newMainPanelAbsoluteWidth - resizerWidth;

      if (containerRect.width > 0) {
        setMainPanelFlexBasis(`${newMainPanelAbsoluteWidth}px`);
        setSidePanelFlexBasis(`${newSidePanelAbsoluteWidth}px`);
      }
    },
    [isResizing, minMainPanelPixelWidth, minSidePanelPixelWidth],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      resize(e.clientX);
    },
    [isResizing, resize],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isResizing || !e.touches[0]) return;
      resize(e.touches[0].clientX);
    },
    [isResizing, resize],
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", stopResizing);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", stopResizing);
      document.addEventListener("mouseleave", stopResizing);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", stopResizing);
      document.removeEventListener("mouseleave", stopResizing);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", stopResizing);
      document.removeEventListener("mouseleave", stopResizing);
      if (isResizing) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isResizing, handleMouseMove, stopResizing, handleTouchMove]);

  return {
    mainPanelStyle: {
      flexBasis: mainPanelFlexBasis,
      width: mainPanelFlexBasis,
      minWidth: `${minMainPanelPixelWidth}px`,
    },
    sidePanelStyle: {
      flexBasis: sidePanelFlexBasis,
      width: sidePanelFlexBasis,
      minWidth: `${minSidePanelPixelWidth}px`,
    },
    startResizing,
    containerRef,
    isResizing,
  };
}
