import './globals.css';

export const metadata = {
  title: 'BestFit AI | Talent Ingestion Engine',
  description: 'AI-assisted resume screening and candidate evaluation pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
