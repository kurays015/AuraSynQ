import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "AuraSynQ",
    description: "A minimalist digital painting mini-app on base app",
    creator: "Kurays",
    authors: [{ name: "Kurays" }],
    other: {
      "base:app_id": "698af51ae1a5644e788acda3",
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl:
          "https://lavender-tropical-takin-516.mypinata.cloud/ipfs/bafkreifcdfiwuucelgpyqcwkk37w6twb7e65cj45a62chp22t5mtszy2gq",
        button: {
          title: `Launch AuraSynQ`,
          action: {
            type: "launch_miniapp",
            name: "AuraSynQ",
            url: "https://aurasynq.vercel.app",
            splashImageUrl:
              "https://lavender-tropical-takin-516.mypinata.cloud/ipfs/bafkreifcdfiwuucelgpyqcwkk37w6twb7e65cj45a62chp22t5mtszy2gq",
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
