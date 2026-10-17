import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js" strategy="afterInteractive" data-subscribe="/newsletter" />
      </body>
    </html>
  );
}
