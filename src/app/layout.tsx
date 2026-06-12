import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang-context";
import { CurrentUserProvider } from "@/lib/current-user-provider";
import AppLayout from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
    <html lang="en" className={`${inter.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="theme-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('bk-crm-theme');
                  var theme = stored === 'dark' ? 'dark' : 'light';
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
          <LangProvider>
          <CurrentUserProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AppLayout>{children}</AppLayout>
              </ConfirmProvider>
            </ToastProvider>
          </CurrentUserProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

