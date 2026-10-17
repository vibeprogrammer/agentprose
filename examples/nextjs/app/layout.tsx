import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/readmcp@0.1/dist/readmcp.min.js" strategy="afterInteractive" data-subscribe="/newsletter" />
      </body>
    </html>
  );
}
