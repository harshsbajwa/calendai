import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window is defined
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);

    // Initial check
    listener();

    // Listen for changes
    try {
      mediaQueryList.addEventListener("change", listener);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Safari < 14 and other older browsers
      mediaQueryList.addListener(listener);
    }

    return () => {
      try {
        mediaQueryList.removeEventListener("change", listener);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Safari < 14 and other older browsers
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}
