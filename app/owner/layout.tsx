"use client";

import { useEffect } from "react";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      if (button.textContent?.trim() === "💲 Prices") {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = "/owner/prices";
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return <>{children}</>;
}
