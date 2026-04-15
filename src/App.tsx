import { Analytics } from "@vercel/analytics/react";
import { OpportunitySheet } from "@/components/opportunity-sheet";

export default function App() {
  return (
    <div className="min-h-svh bg-background">
      <OpportunitySheet />
      <Analytics />
    </div>
  );
}
