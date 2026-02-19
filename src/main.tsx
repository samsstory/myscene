import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Fade scrollbar in on scroll, fade out after idle — macOS style
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
document.addEventListener("scroll", (e) => {
  const target = e.target as Element;
  if (!target || !target.classList) return;
  target.classList.add("is-scrolling");
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    target.classList.remove("is-scrolling");
  }, 800);
}, true);

createRoot(document.getElementById("root")!).render(<App />);

