import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { DiffRow, Proficiency, Willingness } from "../types";

const ProficiencyBadge = ({ value }: { value: Proficiency }) => (
  <Badge variant="secondary" className="capitalize">{value}</Badge>
);
const WillingBadge = ({ value }: { value?: Willingness }) =>
  value ? <Badge variant="outline" className="capitalize">{value === "not_willing" ? "not willing" : value}</Badge>
        : <Badge variant="outline" className="opacity-60">no choice</Badge>;

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  saving: boolean;
  selectionCount: number;
  addedRows: DiffRow[];
  updatedRows: DiffRow[];
  removedRows: DiffRow[];
  onConfirm: () => void;
};

export default function ConfirmSaveDialog({
  open, setOpen, saving, selectionCount, addedRows, updatedRows, removedRows, onConfirm
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm saving preferences?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You’re about to save <span className="font-medium">{selectionCount}</span>{" "}
                {selectionCount === 1 ? "preference" : "preferences"} for your account.
              </p>

              {/* Added */}
              <Section title={`Added (${addedRows.length})`}>
                {addedRows.length === 0 ? <Muted>No new subjects added.</Muted> : addedRows.map((row)=>(
                  <Row key={row.id} code={row.code} name={row.name} gradeLevel={row.gradeLevel} strand={row.strand}>
                    {row.newProf && <ProficiencyBadge value={row.newProf} />}
                    <WillingBadge value={row.newWill} />
                  </Row>
                ))}
              </Section>

              {/* Updated */}
              <Section title={`Updated (${updatedRows.length})`}>
                {updatedRows.length === 0 ? <Muted>No changes to existing subjects.</Muted> : updatedRows.map((row)=>(
                  <Row key={row.id} code={row.code} name={row.name} gradeLevel={row.gradeLevel} strand={row.strand}>
                    {row.oldProf && row.newProf && row.oldProf !== row.newProf ? (
                      <>
                        <ProficiencyBadge value={row.oldProf} /><span className="text-xs">→</span>
                        <ProficiencyBadge value={row.newProf} />
                      </>
                    ) : row.newProf ? <ProficiencyBadge value={row.newProf} /> : null}
                    {row.oldWill !== row.newWill ? (
                      <>
                        <WillingBadge value={row.oldWill} /><span className="text-xs">→</span>
                        <WillingBadge value={row.newWill} />
                      </>
                    ) : <WillingBadge value={row.newWill} />}
                  </Row>
                ))}
              </Section>

              {/* Removed */}
              <Section title={`Removed (${removedRows.length})`}>
                {removedRows.length === 0 ? <Muted>No subjects removed.</Muted> : removedRows.map((row)=>(
                  <Row key={row.id} code={row.code} name={row.name} gradeLevel={row.gradeLevel} strand={row.strand} removed />
                ))}
              </Section>

              {(addedRows.length + updatedRows.length + removedRows.length === 0) && (
                <Muted>No changes detected. You can still save to refresh your preferences.</Muted>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={saving}>
            {saving ? "Saving..." : "Confirm & Save"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border">
      <div className="px-3 py-2 border-b text-sm font-medium">{title}</div>
      <div className="max-h-[180px] overflow-auto p-2 space-y-2">{children}</div>
    </div>
  );
}
function Row({ code, name, gradeLevel, strand, removed, children }:{
  code: string; name: string; gradeLevel?: any; strand?: string; removed?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`text-sm ${removed ? "opacity-70" : ""}`}>
      <div className={`font-medium ${removed ? "line-through" : ""}`}>{code} — {name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {children}
        {gradeLevel ? <Badge variant="outline">G{gradeLevel}</Badge> : null}
        {strand ? <Badge variant="outline">{strand}</Badge> : null}
      </div>
    </div>
  );
}
const Muted = ({ children }: { children: React.ReactNode }) =>
  (<div className="text-sm text-muted-foreground px-1 py-1">{children}</div>);
