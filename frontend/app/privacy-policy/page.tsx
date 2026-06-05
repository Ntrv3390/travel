import type { Metadata } from "next";
import { PrivacyPage } from "@/components/privacy/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Triipzy",
  description: "Learn how Triipzy collects, uses, stores, and protects your information when you use our platform and services.",
  openGraph: {
    title: "Privacy Policy | Triipzy",
    description: "Learn how Triipzy collects, uses, stores, and protects your information.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Triipzy",
    description: "Learn how Triipzy collects, uses, stores, and protects your information.",
  },
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyRoute() {
  return <PrivacyPage />;
}
