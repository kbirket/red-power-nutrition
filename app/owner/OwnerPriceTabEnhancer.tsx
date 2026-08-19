"use client";

import { useEffect } from "react";
import { createClient } from "../../lib/supabase/client";

const icons: Record<string, string> = {
  "loaded teas": "🍹", "teas": "🍹", "protein coffee": "☕",
  "no caffeine": "🧃", "shakes": "🥤", "protein shakes": "🥤",
};

export default function OwnerPriceTabEnhancer() {
  useEffect(() => {
    const supabase = createClient();
    const apply = () => {
      if (window.location.pathname !== "/owner") return;
      const active = document.querySelector(".owner-tabs button.active");
      if (!active || !active.textContent?.includes("Prices")) return;

      const eyebrow = Array.from(document.querySelectorAll(".owner-content .eyebrow")).find(el => el.textContent?.trim() === "PRICING CENTER");
      if (eyebrow) eyebrow.textContent = "MENU PRICING";
      const heading = Array.from(document.querySelectorAll(".owner-content h2")).find(el => el.textContent?.trim() === "Manage prices");
      if (heading) heading.textContent = "Menu prices";

      document.querySelectorAll<HTMLElement>(".owner-content .panel .option-title h3").forEach(el => {
        const raw = el.getAttribute("data-price-label") || el.textContent?.trim() || "";
        if (!el.getAttribute("data-price-label")) el.setAttribute("data-price-label", raw);
        const icon = icons[raw.toLowerCase()];
        if (icon && !el.textContent?.startsWith(icon)) el.textContent = `${icon} ${raw}`;
      });

      document.querySelectorAll<HTMLElement>(".owner-content .panel .option-row").forEach(row => {
        if (row.querySelector("[data-delete-price]")) return;
        const input = row.querySelector<HTMLInputElement>("input[type=text], input:not([type])");
        const money = row.querySelector<HTMLInputElement>("input[type=number]");
        if (!input || !money) return;
        const panel = row.closest<HTMLElement>(".panel");
        const category = panel?.querySelector<HTMLElement>(".option-title h3")?.getAttribute("data-price-label") || "";
        if (!category) return;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "🗑 Delete";
        button.setAttribute("data-delete-price", "true");
        button.className = "delete-price";
        button.onclick = async () => {
          if (!window.confirm(`Delete “${input.value}”? This cannot be undone.`)) return;
          button.disabled = true;
          const { data: cat, error: catError } = await supabase.from("pricing_categories").select("id").eq("name", category).limit(1).single();
          if (catError || !cat) { alert(catError?.message || "Pricing category not found."); button.disabled = false; return; }
          const { error } = await supabase.from("pricing_options").delete().eq("pricing_category_id", cat.id).eq("name", input.value).eq("price", Number(money.value));
          if (error) { alert(error.message); button.disabled = false; return; }
          row.remove();
        };
        row.appendChild(button);
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
