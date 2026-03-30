import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'LegisTracker — Legislative Document Monitor',
  description: 'Monitor U.S. federal and state legislature documents for updates, changes, and additions to bills and resolutions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
