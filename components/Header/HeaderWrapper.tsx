'use client';
import { usePathname } from 'next/navigation';
import FlipNavWrapper from './Navbar';

export function HeaderWrapper() {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  if (isLandingPage) {
    return null;
  }

  return <FlipNavWrapper />;
}
