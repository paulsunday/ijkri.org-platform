import type { Metadata, Viewport } from "next";

import AuthProvider from "@/components/providers/session-provider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://ijkri.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  applicationName:
    "International Journal of Knowledge, Research and Innovation",

  title: {
    default:
      "IJKRI | International Journal of Knowledge, Research and Innovation",
    template: "%s | IJKRI",
  },

  description:
    "The International Journal of Knowledge, Research and Innovation is a multidisciplinary, peer-reviewed, open-access journal published by Innovare Academic Publishing.",

  keywords: [
    "IJKRI",
    "International Journal of Knowledge Research and Innovation",
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
      name: "International Journal of Knowledge, Research and Innovation",
      url: siteUrl,
    },
  ],

  creator: "Innovare Academic Publishing",
  publisher: "Innovare Academic Publishing",

  category: "Academic Publishing",

  referrer: "origin-when-cross-origin",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName:
      "International Journal of Knowledge, Research and Innovation",
    title:
      "IJKRI | International Journal of Knowledge, Research and Innovation",
    description:
      "A multidisciplinary, peer-reviewed and open-access journal publishing rigorous research, practical insights and innovative scholarly contributions.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1200,
        alt: "International Journal of Knowledge, Research and Innovation logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "IJKRI | International Journal of Knowledge, Research and Innovation",
    description:
      "A multidisciplinary, peer-reviewed and open-access scholarly journal published by Innovare Academic Publishing.",
    images: ["/logo.png"],
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

  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },



  other: {
    "journal-title":
      "International Journal of Knowledge, Research and Innovation",
    "journal-abbreviation": "IJKRI",
    publisher: "Innovare Academic Publishing",
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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col antialiased">
        <AuthProvider>
          <Header />

          <main className="flex-1">{children}</main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}