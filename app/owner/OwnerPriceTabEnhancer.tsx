"use client";

import { useEffect } from "react";

const icons: Record<string, string> = {
  "loaded teas": "🍹",
  "teas": "🍹",
  "protein coffee": "☕",
  "no caffeine": "🧃",
  "shakes": "🥤",
  "protein shakes": "🥤",
};

export default function OwnerPriceTabEnhancer() {
  useEffect(() => {
    const apply = () => {
      if (window.location.pathname !== "/owner") return;
      const active = document.querySelector(".owner-tabs button.active");
      if (!active || !active.textContent?.includes("Prices")) return;

      const eyebrow = Array.from(document.querySelectorAll(".owner-content .eyebrow"))
        .find((el) => el.textContent?.trim() === "PRICING CENTER");
      if (eyebrow) eyebrow.textContent = "MENU PRICING";

      const heading = Array.from(document.querySelectorAll(".owner-content h2"))
        .find((el) => el.textContent?.trim() === "Manage prices");
      if (heading) heading.textContent = "Menu prices";

      document.querySelectorAll(".owner-content .panel .option-title h3").forEach((el) => {
        const raw = el.getAttribute("data-price-label") || el.textContent?.trim() || "";
        if (!el.getAttribute("data-price-label")) el.setAttribute("data-price-label", raw);
        const icon = icons[raw.toLowerCase()];
        if (icon && !el.textContent?.startsWith(icon)) el.textContent = `${icon} ${raw}`;
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
