// src/components/ThemeScript.js
//
// Rendered in the ROOT layout's <head>, before the rest of the page paints.
// Reads the saved theme from localStorage and applies the `dark` class to
// <html> immediately, so dark mode is app-wide (every page, every device)
// and there's no flash of light mode on load / hard refresh / navigation.
export default function ThemeScript() {
  const code = `
    (function () {
      try {
        var theme = localStorage.getItem("dmg-theme") || "system";
        var isDark =
          theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", isDark);
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
