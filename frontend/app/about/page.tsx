import type { Metadata } from "next";
import { AboutPage } from "@/components/about/AboutPage";

export const metadata: Metadata = {
  title: "About Us | Triipzy",
  description: "Triipzy helps travelers discover, compare, and book unforgettable experiences across the world. Learn more about our story and mission.",
  openGraph: {
    title: "About Triipzy",
    description: "Triipzy helps travelers discover, compare, and book unforgettable experiences across the world.",
    images: [{ url: "/api/og?title=About+Triipzy&subtitle=Experiences+Worth+Having&page=about", width: 1200, height: 630, alt: "About Triipzy" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Triipzy",
    description: "Triipzy helps travelers discover, compare, and book unforgettable experiences across the world.",
    images: ["/api/og?title=About+Triipzy&subtitle=Experiences+Worth+Having&page=about"],
  },
  alternates: { canonical: "/about" },
};

export default function AboutRoute() {
  return (
    <>
      <AboutPage />
    </>
  );
}
