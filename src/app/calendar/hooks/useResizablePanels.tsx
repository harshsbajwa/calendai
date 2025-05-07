import { useState, useCallback, useEffect, useRef } from "react";

export function useResizablePanels(
  initialMainPanelWidthPercent = 70,
  minMainPanelPixelWidth = 200,
  minSidePanelPixelWidth = 64,
) {
  const [mainPanelFlexBasis, setMainPanelFlexBasis] = useState<string>(
    `${initialMainPanelWidthPercent}%`,
  );
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isResizing]);

  const resize = useCallback(
    (clientX: number) => {
      // Accept clientX directly
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newMainPanelAbsoluteWidth = clientX - containerRect.left;

      newMainPanelAbsoluteWidth = Math.max(
        minMainPanelPixelWidth,
        newMainPanelAbsoluteWidth,
      );
      newMainPanelAbsoluteWidth = Math.min(
        containerRect.width - minSidePanelPixelWidth,
        newMainPanelAbsoluteWidth,
      );

      if (containerRect.width > 0) {
        setMainPanelFlexBasis(`${newMainPanelAbsoluteWidth}px`);
      }
    },
    [minMainPanelPixelWidth, minSidePanelPixelWidth],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        resize(e.clientX);
      });
    },
    [isResizing, resize],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isResizing || !e.touches[0]) return;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        resize(e.touches[0].clientX);
      });
    },
    [isResizing, resize],
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", stopResizing);
      document.addEventListener("touchmove", handleTouchMove);
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isResizing, handleMouseMove, stopResizing, handleTouchMove]);

  return {
    mainPanelStyle: {
      flexBasis: mainPanelFlexBasis,
      width: mainPanelFlexBasis,
    },
    startResizing,
    containerRef,
    isResizing,
  };
}
