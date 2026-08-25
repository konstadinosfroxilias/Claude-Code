import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { AppProviders } from "@/components/shared/app-providers";
import "./globals.css";

/**
 * Typography — every face that can render user copy MUST ship Greek.
 *
 * Inter (body) and Manrope (display) both include the Greek subset, so a
 * heading mixing Greek and Latin ("Κάθε premium στούντιο") renders in one
 * typeface. Space Grotesk has NO Greek glyphs, so it is confined to the
 * all-caps Latin "PULSE" wordmark via --font-wordmark — never to body copy.
 */
const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "greek"],
  display: "swap",
});

const display = Manrope({
  variable: "--font-disp",
  subsets: ["latin", "greek"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const wordmark = Space_Grotesk({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
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
      className={`${body.variable} ${display.variable} ${wordmark.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
