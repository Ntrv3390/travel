import type { Metadata } from "next";
import { SingleExperienceLandingDemo } from "@/components/demo/SingleExperienceLandingDemo";

export const metadata: Metadata = {
  title: "Demo Single Experience Landing",
  description: "Animated demo landing page for a single thing-to-do experience.",
};

export default function DemoSingleExperiencePage() {
  return <SingleExperienceLandingDemo />;
}
