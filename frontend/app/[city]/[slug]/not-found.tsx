import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ExperienceNotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-section text-center">
      <h1 className="text-display-sm font-bold">Experience not found</h1>
      <p className="text-muted-foreground">This experience may have been removed or the link has changed.</p>
      <Button asChild>
        <Link href="/">Browse experiences</Link>
      </Button>
    </div>
  );
}
