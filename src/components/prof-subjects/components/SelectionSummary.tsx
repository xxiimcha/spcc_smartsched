import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Lock } from "lucide-react";
import { Proficiency, Willingness } from "../types";

const ProficiencyBadge = ({ value }: { value: Proficiency }) => (
  <Badge variant="secondary" className="capitalize">{value}</Badge>
);
const WillingBadge = ({ value }: { value?: Willingness }) =>
  value ? (
    <Badge variant="outline" className="capitalize">
      {value === "not_willing" ? "not willing" : value}
    </Badge>
  ) : (
    <Badge variant="outline" className="opacity-60">no choice</Badge>
  );

type Row = {
  id: number; code: string; name: string;
  proficiency: Proficiency; willingness?: Willingness;
  strand?: string; gradeLevel?: string | number;
};
type Props = {
  rows: Row[];
  lockedAssigned: Set<number>;
  onRemove: (id: number) => void;
};

export default function SelectionSummary({ rows, lockedAssigned, onRemove }: Props) {
  return (
    <Card className="h-min xl:sticky xl:top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Selection Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Total selected: <span className="font-medium">{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No selections yet.</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {row.code} — {row.name}
                    {lockedAssigned.has(row.id) && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground align-middle">
                        <Lock className="h-3 w-3" /> Assigned
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <ProficiencyBadge value={row.proficiency} />
                    <WillingBadge value={row.willingness} />
                    {row.gradeLevel ? <Badge variant="outline">G{row.gradeLevel}</Badge> : null}
                    {row.strand ? <Badge variant="outline">{row.strand}</Badge> : null}
                  </div>
                </div>
                <Button
                  data-stop size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                  title={lockedAssigned.has(row.id) ? "Assigned — cannot remove" : "Remove from selection"}
                  onClick={() => { if (!lockedAssigned.has(row.id)) onRemove(row.id); }}
                  disabled={lockedAssigned.has(row.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
