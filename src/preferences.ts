type ThemeMode = "light" | "dark";

type LanguageMode = "en-IN" | "gu-IN";

const THEME_KEY = "vaanibill_theme";
const LANG_KEY = "vaanibill_lang";

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new CustomEvent("vaanibill-theme", { detail: theme }));
}

export function onThemeChange(handler: (theme: ThemeMode) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<ThemeMode>).detail;
    if (detail === "light" || detail === "dark") {
      handler(detail);
    }
  };
  window.addEventListener("vaanibill-theme", listener);
  return () => window.removeEventListener("vaanibill-theme", listener);
}

export function getLanguage(): LanguageMode {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "gu-IN" || saved === "en-IN") return saved;
  return "en-IN";
}

export function setLanguage(language: LanguageMode) {
  localStorage.setItem(LANG_KEY, language);
  window.dispatchEvent(new CustomEvent("vaanibill-lang", { detail: language }));
}

export function onLanguageChange(handler: (language: LanguageMode) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LanguageMode>).detail;
    if (detail === "gu-IN" || detail === "en-IN") {
      handler(detail);
    }
  };
  window.addEventListener("vaanibill-lang", listener);
  return () => window.removeEventListener("vaanibill-lang", listener);
}
