import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Lock } from "lucide-react";
import { Proficiency, Willingness } from "../types";

type Props = {
  id: number;
  code: string;
  name: string;
  units?: number;
  type?: string;
  gradeLevel?: string | number;
  strand?: string;
  isSelected: boolean;
  isLocked: boolean;
  level?: Proficiency;
  willing?: Willingness;
  isMissingWill: boolean;
  onToggle: () => void;
  onLevelChange: (v: Proficiency) => void;
  onWillingChange: (v: Willingness) => void;
  toastAssignedBlocked: () => void;
};

export default function SubjectCard(props: Props) {
  const {
    code, name, units, type, gradeLevel, strand,
    isSelected, isLocked, level, willing, isMissingWill,
    onToggle, onLevelChange, onWillingChange, toastAssignedBlocked
  } = props;

  return (
    <Card
      className={`border transition cursor-pointer ${isSelected ? (isMissingWill ? "border-red-500 ring-1 ring-red-300" : "border-blue-600 ring-1 ring-blue-300") : ""} ${isLocked ? "bg-muted/30" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-stop]")) return;
        if (isLocked) { toastAssignedBlocked(); return; }
        onToggle();
      }}
      title={isLocked ? "This subject is already assigned and cannot be deselected." : undefined}
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="truncate">{code}</span>
          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Assigned
              </span>
            )}
            {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-medium">{name}</p>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {units != null && <Badge variant="outline">{units} units</Badge>}
          {type && <Badge variant="outline">{type}</Badge>}
          {gradeLevel && <Badge variant="outline">Grade {gradeLevel}</Badge>}
          {strand && <Badge variant="outline">{strand}</Badge>}
        </div>

        {/* Proficiency */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">Proficiency</span>
          <div data-stop className="min-w-0 w-full sm:w-auto">
            <Select value={level ?? ""} onValueChange={(v)=>onLevelChange(v as Proficiency)} disabled={!isSelected}>
              <SelectTrigger className="w-full sm:w-44 max-w-full"><SelectValue placeholder="Not selected" /></SelectTrigger>
              <SelectContent position="popper" side="top" align="end" sideOffset={4} className="w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto">
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Willingness */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">Willing to teach?</span>
          <div data-stop className="min-w-0 w-full sm:w-auto">
            <Select value={willing ?? ""} onValueChange={(v)=>onWillingChange(v as Willingness)} disabled={!isSelected}>
              <SelectTrigger className="w-full sm:w-44 max-w-full">
                <SelectValue placeholder={isSelected ? (isMissingWill ? "Required" : "Choose an option") : "Select a subject first"} />
              </SelectTrigger>
              <SelectContent position="popper" side="top" align="end" sideOffset={4} className="w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto">
                <SelectItem value="willing">Willing</SelectItem>
                <SelectItem value="not_willing">Not willing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
