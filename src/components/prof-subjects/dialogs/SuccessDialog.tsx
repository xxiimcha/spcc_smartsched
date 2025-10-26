import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Proficiency, Willingness } from "../types";

const ProficiencyBadge = ({ value }: { value: Proficiency }) => (
  <Badge variant="secondary" className="capitalize">{value}</Badge>
);
const WillingBadge = ({ value }: { value?: Willingness }) =>
  value ? <Badge variant="outline" className="capitalize">{value === "not_willing" ? "not willing" : value}</Badge>
        : <Badge variant="outline" className="opacity-60">no choice</Badge>;

type Row = {
  id: number; code: string; name: string;
  proficiency: Proficiency; willingness?: Willingness;
  strand?: string; gradeLevel?: any;
};
type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  savedCount: number;
  summary: Row[];
};

export default function SuccessDialog({ open, setOpen, savedCount, summary }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Preferences saved</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {savedCount} {savedCount === 1 ? "preference has" : "preferences have"} been successfully updated for your account.
              </p>
              {summary.length > 0 ? (
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Summary of choices</div>
                  <div className="max-h-[260px] overflow-auto p-2 space-y-2">
                    {summary.map((row) => (
                      <div key={row.id} className="text-sm">
                        <div className="font-medium">{row.code} — {row.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <ProficiencyBadge value={row.proficiency} />
                          <WillingBadge value={row.willingness} />
                          {row.gradeLevel ? <Badge variant="outline">G{row.gradeLevel}</Badge> : null}
                          {row.strand ? <Badge variant="outline">{row.strand}</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No selections to show.</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setOpen(false)}>Done</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
