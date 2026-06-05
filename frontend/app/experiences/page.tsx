import { redirect } from "next/navigation";

export default function ExperiencesPage() {
  redirect("/search");
}

export const metadata = {
  robots: { index: false, follow: true, canonical: "/search" },
};
