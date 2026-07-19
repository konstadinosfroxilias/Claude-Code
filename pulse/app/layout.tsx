import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { AppProviders } from "@/components/shared/app-providers";
import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "greek"],
});

const display = Space_Grotesk({
  variable: "--font-disp",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — One pass. Every studio.`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "One membership, credits for boutique fitness studios across Greece.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
