import { Hexagon } from 'lucide-react';
import Reveal from './Reveal';

const NAV_LINKS = [
  { label: 'Projects', badge: '6' },
  { label: 'About' },
  { label: 'Blog' },
  { label: 'Contact' },
];

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/15 backdrop-blur-md">
      <div className="flex items-center justify-between px-5 py-4 sm:px-8 md:px-12">
        <Reveal delayMs={0} className="flex items-center gap-2">
          <Hexagon size={24} strokeWidth={1.5} className="text-white" />
          <span className="text-lg font-medium tracking-tight sm:text-xl">
            novaai
          </span>
        </Reveal>

        <div className="hidden items-center gap-8 md:flex lg:gap-10">
          {NAV_LINKS.map((link, i) => (
            <Reveal key={link.label} delayMs={100 + i * 100}>
              <a
                href="#"
                className="flex items-center gap-1 text-sm text-white/85 transition-colors duration-300 hover:text-white"
              >
                {link.label}
                {link.badge && (
                  <sup className="font-mono text-[10px] text-white/60">
                    {link.badge}
                  </sup>
                )}
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={500}>
          <button className="rounded-md border border-white/20 bg-white/15 px-4 py-2 text-xs backdrop-blur-md transition-colors duration-300 hover:bg-white/25 sm:px-5 sm:text-sm">
            Get Free Consultation
          </button>
        </Reveal>
      </div>
    </nav>
  );
}
