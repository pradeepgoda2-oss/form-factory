import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ClientBootstrap from '@/components/ClientBootstrap';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Form Factory',
  description: 'Create and manage dynamic forms easily',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className='bg-light d-flex flex-column min-vh-100'>
        <ClientBootstrap />
        <Navbar />
        <main className="flex-grow-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
