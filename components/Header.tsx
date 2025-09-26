"use client";

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const Header = ({ children, className }: HeaderProps) => {
  return (
    <div className={cn("header px-2 md:px-0 sticky top-0 z-50 md:static bg-dark-200/90 backdrop-blur supports-[backdrop-filter]:bg-dark-200/75 border-b border-dark-400 flex items-center h-10 md:h-auto", className)}>
      <Link href='/' className="md:flex-1 flex items-center gap-2 min-w-0">
        <span className="hidden md:flex items-center gap-2">
          <Image 
            src="/assets/icons/logo-icon.svg"
            alt="Weiteredge logo"
            width={28}
            height={28}
          />
          <span className="brand-text">Weiteredge</span>
        </span>
        <Image 
          src="/assets/icons/logo-icon.svg"
          alt="Weiteredge logo"
          width={24}
          height={24}
          className="mr-2 md:hidden"
        />
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <button
          className="md:hidden toolbar-item !px-2 !py-1"
          aria-label="More"
          onClick={() => {
            try {
              if ((window as any).__openMobileMenu) {
                (window as any).__openMobileMenu();
              } else {
                window.dispatchEvent(new CustomEvent('mobile:openMenu'));
              }
            } catch {}
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⋮</span>
        </button>
      </div>
    </div>
  )
}

export default Header