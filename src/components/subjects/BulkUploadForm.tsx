import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void> | void;
  isUploading?: boolean;
  title?: string;
  description?: string;
};

const ACCEPT =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

const MAX_PREVIEW_ROWS = 10;

// Canonical column keys we expect in the UPDATED template
const CANONICAL_ORDER = [
  "code",
  "name",
  "subject type",
  "description",
  "grade level",
  "strand",
  "semester",
] as const;
type CanonicalKey = (typeof CANONICAL_ORDER)[number];

// Map common header variations -> canonical keys
const HEADER_ALIASES: Record<string, CanonicalKey> = {
  code: "code",
  "subject code": "code",
  "subj code": "code",

  name: "name",
  "subject name": "name",
  title: "name",

  "subject type": "subject type",
  type: "subject type",
  "subj type": "subject type",

  description: "description",
  desc: "description",

  "grade level": "grade level",
  grade_level: "grade level",
  "year level": "grade level",
  year_level: "grade level",
  grade: "grade level",

  strand: "strand",
  "track/strand": "strand",

  semester: "semester",
  sem: "semester",
};

const REQUIRED_KEYS: CanonicalKey[] = [
  "code",
  "name",
  "subject type",
  "grade level",
  "strand",
  "semester",
];
// description is optional but supported

// Use min-widths so long values don't crush columns; allow horizontal scroll
const widthByCol = (key: string) => {
  const k = key.toLowerCase();
  if (k === "code") return "min-w-[120px]";
  if (k === "name") return "min-w-[280px]";
  if (k === "description") return "min-w-[380px]";
  if (k === "subject type") return "min-w-[160px]";
  if (k === "grade level") return "min-w-[140px]";
  if (k === "strand") return "min-w-[120px]";
  if (k === "semester") return "min-w-[160px]";
  return "min-w-[200px]";
};

const normalize = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_\-]+/g, " ")
    .trim();

const BulkUploadForm: React.FC<Props> = ({
  open,
  onOpenChange,
  onUpload,
  isUploading = false,
  title = "Bulk Upload Subjects",
  description = "Upload an Excel file (.xlsx or .xls) with your subjects. We’ll validate and import them.",
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sheetName, setSheetName] = useState<string>("");
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);

  // progress animation state
  const [progress, setProgress] = useState(0); // 0..100
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const durationRef = useRef<number>(1500); // dynamically set after parsing

  const resetState = () => {
    setFile(null);
    setError("");
    setSheetName("");
    setDisplayColumns([]);
    setRows([]);
    setTotalRows(0);
    stopAnimation(true);
  };

  const validate = (f: File | null) => {
    if (!f) {
      setError("Please choose an Excel file (.xlsx or .xls).");
      return false;
    }
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls"].includes(ext || "")) {
      setError("Only Excel files (.xlsx, .xls) are allowed.");
      return false;
    }
    return true;
  };

  const parsePreview = async (f: File) => {
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheet];
      if (!ws) {
        setError("No worksheet found in the file.");
        setSheetName("");
        setDisplayColumns([]);
        setRows([]);
        setTotalRows(0);
        return;
      }
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setSheetName(firstSheet);

      setTotalRows(json.length);
      if (json.length === 0) {
        setDisplayColumns([]);
        setRows([]);
        return;
      }

      const firstObj = json[0] as Record<string, any>;
      const rawHeaders = Object.keys(firstObj);

      const toCanonical: Record<string, CanonicalKey | undefined> = {};
      for (const h of rawHeaders) {
        const norm = normalize(h);
        toCanonical[h] = HEADER_ALIASES[norm] ?? (CANONICAL_ORDER as readonly string[]).includes(norm)
          ? (norm as CanonicalKey)
          : undefined;
      }

      const presentCanon = new Set(
        rawHeaders.map((h) => toCanonical[h]).filter(Boolean) as CanonicalKey[]
      );
      const missing = REQUIRED_KEYS.filter((k) => !presentCanon.has(k));
      if (missing.length) {
        setError(
          `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(
            ", "
          )}. Please update your Excel headers to match the template.`
        );
        setDisplayColumns([]);
        setRows([]);
        return;
      }

      const desiredOrder: string[] = CANONICAL_ORDER.filter((k) => presentCanon.has(k));
      if (!desiredOrder.includes("description") && presentCanon.has("description")) {
        desiredOrder.splice(2, 0, "description");
      }

      const normalizedRows = json.map((row) => {
        const out: Record<string, any> = {};
        for (const origKey of Object.keys(row)) {
          const canon = toCanonical[origKey];
          if (canon) out[canon] = row[origKey] ?? "";
        }
        for (const key of CANONICAL_ORDER) {
          if (!(key in out)) out[key] = "";
        }
        return out;
      });

      setDisplayColumns(desiredOrder);
      setRows(normalizedRows.slice(0, MAX_PREVIEW_ROWS));

      const est = Math.min(8000, Math.max(1000, json.length * 60));
      durationRef.current = est;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read the Excel file.");
      setDisplayColumns([]);
      setRows([]);
      setTotalRows(0);
    }
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    setError("");
    const f = e.target.files?.[0] ?? null;
    setFile(f ?? null);
    setDisplayColumns([]);
    setRows([]);
    setSheetName("");
    setTotalRows(0);
    stopAnimation(true);

    if (f && validate(f)) {
      await parsePreview(f);
    }
  };

  // ---- Progress animation helpers ----
  const tick = (t: number) => {
    if (startRef.current == null) startRef.current = t;
    const elapsed = t - startRef.current;
    const dur = durationRef.current;
    const pct = Math.min(99, Math.floor((elapsed / dur) * 100));
    setProgress(pct);
    if (pct < 99 && isUploading) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const startAnimation = () => {
    setProgress(0);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAnimation = (reset: boolean) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    if (reset) setProgress(0);
  };

  const finishAndClear = () => {
    setProgress(100);
    const id = setTimeout(() => {
      stopAnimation(true);
      resetState();
      onOpenChange(false);
    }, 300);
    return () => clearTimeout(id);
  };

  const handleSubmit = async () => {
    if (!validate(file)) return;

    startAnimation();
    try {
      await onUpload(file!);
      finishAndClear();
    } catch {
      stopAnimation(false);
    }
  };

  useEffect(() => {
    if (isUploading) {
      if (!rafRef.current) startAnimation();
    } else if (progress > 0 && progress < 100) {
      setProgress(100);
      const id = setTimeout(() => stopAnimation(false), 300);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      {/* Force solid background & high z-index to avoid bleed-through */}
      <DialogContent className="bg-white sm:max-w-[1100px] z-[60]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input type="file" accept={ACCEPT} onChange={onFileChange} />
          {file && (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{file.name}</span>
              {sheetName ? <span> • Sheet: {sheetName}</span> : null}
              {totalRows > 0 ? (
                <span> • {totalRows} row{totalRows > 1 ? "s" : ""}</span>
              ) : null}
            </div>
          )}
          {!!error && <div className="text-sm text-red-600">{error}</div>}

          {(isUploading || progress > 0) && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  Uploading{totalRows ? ` ${totalRows} row${totalRows > 1 ? "s" : ""}` : ""}...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                <div
                  className="h-2 bg-blue-600 transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && displayColumns.length > 0 && (
            <div
              className="
                mt-2 border rounded-md bg-white shadow-sm
                overflow-auto max-h-[60vh]
              "
            >
              <Table className="table-fixed min-w-[900px] bg-white">
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow className="bg-gray-50">
                    {displayColumns.map((c) => (
                      <TableHead
                        key={c}
                        className={`${widthByCol(c)} bg-gray-50 text-foreground`}
                      >
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {rows.map((r, idx) => (
                    <TableRow key={idx} className="bg-white">
                      {displayColumns.map((c) => (
                        <TableCell
                          key={c}
                          className="whitespace-normal break-words align-top text-sm bg-white"
                        >
                          {String(r[c] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Previewing first {Math.min(rows.length, MAX_PREVIEW_ROWS)} row
              {rows.length > 1 ? "s" : ""}. Expected columns:&nbsp;
              <code>code</code>, <code>name</code>, <code>subject type</code>,{" "}
              <code>description</code>, <code>grade level</code>, <code>strand</code>,{" "}
              <code>semester</code>.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !file}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadForm;
