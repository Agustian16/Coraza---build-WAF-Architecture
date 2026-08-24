"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui";

// ponytail: hand-rolled next-themes — class toggle + localStorage covers this app
const THEME_EVENT = "corazium-theme";

function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function useIsLight() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("light"),
    () => null // server snapshot — resolved after hydration, no mismatch
  );
}

export function ThemeToggle() {
  const light = useIsLight();

  const toggle = () => {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.theme = next ? "light" : "dark";
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <Button variant="ghost" onClick={toggle} aria-label="Toggle theme">
      {light ? <Moon size={14} /> : <Sun size={14} />}
      {light === true ? "Dark" : "Light"}
    </Button>
  );
}

// Runs before hydration to apply the stored theme without a flash.
export const themeInitScript = `try{if(localStorage.theme==='light')document.documentElement.classList.add('light')}catch(e){}`;
