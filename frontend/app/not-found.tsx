import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-section text-center">
      <h1 className="text-display-sm font-bold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">The page you are looking for does not exist or may have moved.</p>
      <Button asChild>
        <Link href="/">Go back home</Link>
      </Button>
    </div>
  );
}
