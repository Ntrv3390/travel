import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const COLORS = {
  primary: "#0ea5e9",
  primaryDark: "#0284c7",
  dark: "#0f172a",
  muted: "#64748b",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = truncate(searchParams.get("title") ?? "Triipzy", 60);
  const subtitle = truncate(searchParams.get("subtitle") ?? "Experiences Worth Having", 80);
  const page = searchParams.get("page") ?? "home";

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="${COLORS.primary}"/><text x="20" y="27" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="white">T</text></svg>`;

  const bgPattern = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${COLORS.primary}" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="${COLORS.primary}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="${COLORS.bg}"/>
    <rect width="1200" height="630" fill="url(#g1)"/>
    <circle cx="1100" cy="80" r="200" fill="${COLORS.primary}" opacity="0.04"/>
    <circle cx="100" cy="550" r="150" fill="${COLORS.primary}" opacity="0.04"/>
  </svg>`;

  const pageLabel: Record<string, string> = {
    home: "",
    products: "Experiences",
    cities: "Destinations",
    about: "About Us",
    help: "Help Center",
    search: "Search",
    privacy: "Privacy Policy",
  };

  const label = pageLabel[page] ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={`data:image/svg+xml,${encodeURIComponent(bgPattern)}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />

        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "60px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <img
            src={`data:image/svg+xml,${encodeURIComponent(logoSvg)}`}
            width="40"
            height="40"
          />
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: COLORS.dark,
              letterSpacing: "-0.02em",
            }}
          >
            Triipzy
          </span>
        </div>

        {label && (
          <div
            style={{
              position: "absolute",
              top: "48px",
              right: "60px",
              background: COLORS.primary,
              color: "white",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "600",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "60px",
            right: "60px",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? "44px" : "56px",
              fontWeight: "800",
              color: COLORS.dark,
              lineHeight: "1.1",
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "22px",
              color: COLORS.muted,
              lineHeight: "1.4",
              maxWidth: "700px",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "60px",
            right: "60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "15px",
              color: COLORS.muted,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            triipzy.com
          </div>
          <div
            style={{
              width: "60px",
              height: "4px",
              borderRadius: "2px",
              background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
