import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import AuthProvider from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.ijkri.org";

const journalName =
  "International Journal of Knowledge, Research and Innovation";

const publisherName = "Innovare Academic Publishing";

const siteDescription =
  "The International Journal of Knowledge, Research and Innovation is a multidisciplinary, peer-reviewed and open-access journal published by Innovare Academic Publishing.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  applicationName: journalName,

  title: {
    default:
      "IJKRI | International Journal of Knowledge, Research and Innovation",
    template: "%s | IJKRI",
  },

  description: siteDescription,

  keywords: [
    "IJKRI",
    "International Journal of Knowledge Research and Innovation",
    "International Journal of Knowledge, Research and Innovation",
    "Innovare Academic Publishing",
    "academic journal",
    "peer-reviewed journal",
    "open-access journal",
    "multidisciplinary research",
    "research and innovation",
    "scholarly publishing",
    "academic publishing",
    "management research",
    "social science research",
    "technology research",
    "education research",
    "sustainability research",
  ],

  authors: [
    {
      name: journalName,
      url: siteUrl,
    },
    {
      name: publisherName,
      url: siteUrl,
    },
  ],

  creator: publisherName,
  publisher: publisherName,
  category: "Academic Publishing",

  referrer: "origin-when-cross-origin",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: siteUrl,

    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],

    shortcut: "/favicon.ico",

    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: journalName,

    title:
      "IJKRI | International Journal of Knowledge, Research and Innovation",

    description:
      "A multidisciplinary, peer-reviewed and open-access journal publishing rigorous research, practical insights and innovative scholarly contributions.",

    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: `${journalName} logo`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "IJKRI | International Journal of Knowledge, Research and Innovation",

    description:
      "A multidisciplinary, peer-reviewed and open-access scholarly journal published by Innovare Academic Publishing.",

    images: ["/opengraph-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,

    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  verification: {
    /*
     * Add your Google Search Console verification value here
     * when available:
     *
     * google: "YOUR_GOOGLE_VERIFICATION_CODE",
     */
  },

  other: {
    "journal-title": journalName,
    "journal-abbreviation": "IJKRI",
    publisher: publisherName,
    "content-language": "en",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,

  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#020617",
    },
  ],

  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <OrganizationJsonLd />

        <AuthProvider>
          <Header />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </AuthProvider>

        <Toaster />

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}