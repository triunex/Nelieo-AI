export const applyTheme = (theme: "light" | "dark" | "system") => {
  const root = document.documentElement;
  // Remove both classes before applying
  root.classList.remove("light", "dark");

  let resolved: "light" | "dark" = "light";
  if (theme === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    resolved = prefersDark ? "dark" : "light";
  } else {
    resolved = theme;
  }

  root.classList.add(resolved);
  localStorage.setItem("theme", theme);
};

export const getStoredTheme = (): "light" | "dark" | "system" => {
  return (
    (localStorage.getItem("theme") as "light" | "dark" | "system") || "system"
  );
};
