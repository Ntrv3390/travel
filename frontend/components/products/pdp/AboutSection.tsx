"use client";

import { useState, useEffect } from "react";

interface AboutSectionProps {
  shortSummary: string;
  summaryHtml: string | null;
}

export function AboutSection({ shortSummary, summaryHtml }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const content = summaryHtml ?? shortSummary;
  if (!content) return null;

  return (
    <section
      id="about"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        scrollMarginTop: 96,
      }}
    >
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .triipzy-about * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        .triipzy-about-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 16px 0;
          letter-spacing: -0.01em;
        }

        .triipzy-about-section-title .title-icon {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a9de0;
        }

        .triipzy-about-card {
          background: #ffffff;
          border: 1px solid #e8ecf0;
          border-radius: 12px;
          overflow: hidden;
        }

        .triipzy-about-body {
          padding: 20px 20px 0 20px;
        }

        .triipzy-about-prose {
          font-size: 14px;
          line-height: 1.75;
          color: #444c55;
          font-weight: 400;
        }

        .triipzy-about-prose strong,
        .triipzy-about-prose b {
          font-weight: 600;
          color: #1a1a1a;
        }

        .triipzy-about-prose p {
          margin: 0 0 12px 0;
        }

        .triipzy-about-prose p:last-child {
          margin-bottom: 0;
        }

        .triipzy-about-prose ul,
        .triipzy-about-prose ol {
          margin: 0 0 12px 0;
          padding-left: 20px;
        }

        .triipzy-about-prose li {
          margin-bottom: 6px;
        }

        .triipzy-expand-wrapper {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .triipzy-expand-wrapper.open {
          max-height: 3000px;
        }

        .triipzy-toggle-row {
          padding: 12px 20px 18px 20px;
          display: flex;
          align-items: center;
        }

        .triipzy-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          font-weight: 600;
          color: #1a9de0;
          font-family: 'Inter', sans-serif;
          transition: color 0.15s;
        }

        .triipzy-toggle-btn:hover {
          color: #1585c0;
        }

        .triipzy-toggle-btn svg {
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }

        .triipzy-toggle-btn.open svg {
          transform: rotate(180deg);
        }

        @media (max-width: 600px) {
          .triipzy-about-body { padding: 16px 16px 0 16px; }
          .triipzy-toggle-row { padding: 10px 16px 16px 16px; }
          .triipzy-about-section-title { font-size: 16px; }
        }
      `}</style>

      <div className="triipzy-about">
        {/* Section heading — matches "Highlights" / "What's Included" style */}
        <h2 className="triipzy-about-section-title">
          <span className="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </span>
          About This Experience
        </h2>

        <div className="triipzy-about-card">
          <div className="triipzy-about-body">
            {/* Always-visible short summary */}
            <p className="triipzy-about-prose" style={{ margin: "0 0 4px 0" }}>
              {shortSummary}
            </p>

            {/* Expandable full HTML content */}
            {summaryHtml && (
              <div className={`triipzy-expand-wrapper${expanded ? " open" : ""}`}>
                <div
                  className="triipzy-about-prose"
                  style={{ paddingTop: 10 }}
                  dangerouslySetInnerHTML={{ __html: summaryHtml }}
                />
              </div>
            )}
          </div>

          {/* Toggle button */}
          {summaryHtml && (
            <div className="triipzy-toggle-row">
              <button
                className={`triipzy-toggle-btn${expanded ? " open" : ""}`}
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
              >
                {expanded ? "Show less" : "Read more"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}