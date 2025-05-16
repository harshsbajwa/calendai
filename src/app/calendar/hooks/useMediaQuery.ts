import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);

    // Initial check
    listener();

    // Listen for changes
    try {
      mediaQueryList.addEventListener("change", listener);
    } catch (e) {
      // Safari < 14
      mediaQueryList.addListener(listener);
    }

    return () => {
      try {
        mediaQueryList.removeEventListener("change", listener);
      } catch (e) {
        // Safari < 14
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}
