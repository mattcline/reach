'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

interface LegalDocumentLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export default function LegalDocumentLayout({ children, title, lastUpdated }: LegalDocumentLayoutProps) {
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    // Generate table of contents from h2 and h3 elements
    const headings = document.querySelectorAll('h2, h3');
    const toc: TableOfContentsItem[] = [];
    
    headings.forEach((heading) => {
      const id = heading.textContent?.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-') || '';
      heading.id = id;
      
      toc.push({
        id,
        text: heading.textContent || '',
        level: heading.tagName === 'H2' ? 2 : 3,
      });
    });
    
    setTableOfContents(toc);

    // Set up intersection observer for active section highlighting
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px',
      }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => {
      headings.forEach((heading) => observer.unobserve(heading));
    };
  }, [children]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-neutral-50 to-neutral-100/50 dark:from-neutral-900 dark:to-neutral-950/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground tracking-tight">{title}</h1>
            <p className="text-base text-muted-foreground">Last Updated: {lastUpdated}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Table of Contents - Sticky Sidebar */}
          <aside className="lg:w-72 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-8 bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Table of Contents</h2>
              <nav className="space-y-0.5">
                {tableOfContents.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`
                      block w-full text-left px-3 py-2 rounded-md transition-all duration-200
                      ${item.level === 3 ? 'pl-8 text-sm' : 'text-base'}
                      ${activeSection === item.id 
                        ? 'bg-neutral-100 text-foreground font-medium dark:bg-neutral-800' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-900'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      {item.level === 3 && <ChevronRight className="w-3 h-3 mr-1" />}
                      <span className="truncate">{item.text}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-card rounded-lg border border-border">
              <div className="px-8 py-10 max-w-none prose prose-lg prose-neutral dark:prose-invert prose-headings:scroll-mt-20">
                {children}
              </div>
            </div>

            {/* Back to Top Button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Back to top
              </button>
            </div>
          </main>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy_policy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/resources/ca_disclosures" className="hover:text-foreground transition-colors">
              CA Disclosures
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}