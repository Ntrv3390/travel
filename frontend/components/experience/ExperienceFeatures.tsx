import { CheckCircle2, XCircle } from "lucide-react";

export function ExperienceFeatures({ inclusions, exclusions }: { inclusions: string[]; exclusions: string[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">What is included</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {inclusions.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">What is excluded</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {exclusions.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 text-red-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
