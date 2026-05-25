import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme-context";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "BK Media CRM — Video Department",
  description: "BK Media CRM — Kit 1 Video Department Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="theme-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('bk-crm-theme');
                  var supportLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                  var theme = stored === 'light' || (stored !== 'dark' && supportLight) ? 'light' : 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-bg text-tx min-h-screen">
        <ThemeProvider>
          <StoreProvider>
            <div className="app-layout">
              <SiteHeader />
              <div className="app-body">
                <AppSidebar />
                <main className="app-content">{children}</main>
              </div>
            </div>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
