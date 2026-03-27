import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'LegisTracker — Legislative Document Monitor',
  description: 'Monitor U.S. federal and state legislature documents for updates, changes, and additions to bills and resolutions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <div className="page-container">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
