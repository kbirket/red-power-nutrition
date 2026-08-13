import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Power Nutrition",
  description: "Ordering, staff, school delivery, loyalty, and analytics"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}