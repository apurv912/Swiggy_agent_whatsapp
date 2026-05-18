import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Grocery Pre-Cart",
  description: "WhatsApp-style household grocery pre-cart MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
