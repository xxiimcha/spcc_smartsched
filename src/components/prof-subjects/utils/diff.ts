import { SelectionRow, Snap, Proficiency, Willingness, DiffRow } from "../types";

export function computeSelectionSummary(
  prefs: Record<number, Proficiency | undefined>,
  willing: Record<number, Willingness | undefined>,
  subjects: Array<{ id: number; code: string; name: string; strand?: string; gradeLevel?: any; units?: number; type?: string; }>
): SelectionRow[] {
  const rows = Object.entries(prefs)
    .filter(([, v]) => !!v)
    .map(([idStr, prof]) => {
      const id = Number(idStr);
      const subj = subjects.find((s) => s.id === id);
      return {
        id,
        code: subj?.code ?? `#${id}`,
        name: subj?.name ?? "Unknown subject",
        proficiency: prof as Proficiency,
        willingness: willing[id],
        strand: subj?.strand,
        gradeLevel: subj?.gradeLevel,
        units: subj?.units,
        type: subj?.type,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  return rows;
}

export function snapshotFromState(
  prefs: Record<number, Proficiency | undefined>,
  willing: Record<number, Willingness | undefined>
): Map<number, Snap> {
  const m = new Map<number, Snap>();
  Object.entries(prefs).forEach(([idStr, prof]) => {
    if (prof) m.set(Number(idStr), { prof: prof as Proficiency, will: willing[Number(idStr)] });
  });
  return m;
}

export function computeDiff(
  initial: Map<number, Snap>,
  current: Map<number, Snap>,
  subjects: Array<{ id: number; code: string; name: string; strand?: string; gradeLevel?: any; }>
) {
  const find = (id: number) => subjects.find((s) => s.id === id);
  const toRow = (id: number, snap?: Snap) => {
    const subj = find(id);
    return {
      id,
      code: subj?.code ?? `#${id}`,
      name: subj?.name ?? "Unknown subject",
      strand: subj?.strand,
      gradeLevel: subj?.gradeLevel,
      oldProf: undefined as Proficiency | undefined,
      newProf: snap?.prof,
      oldWill: undefined as Willingness | undefined,
      newWill: snap?.will,
    };
  };

  const added: number[] = [];
  const removed: number[] = [];
  const updated: number[] = [];

  current.forEach((_, id) => { if (!initial.has(id)) added.push(id); });
  initial.forEach((_, id) => { if (!current.has(id)) removed.push(id); });
  current.forEach((cur, id) => {
    const prev = initial.get(id); if (!prev) return;
    if (prev.prof !== cur.prof || (prev.will || "") !== (cur.will || "")) updated.push(id);
  });

  const addedRows = added.sort((a,b)=>a-b).map((id)=>toRow(id, current.get(id)));
  const removedRows = removed.sort((a,b)=>a-b).map((id)=>toRow(id, initial.get(id)));
  const updatedRows: DiffRow[] = updated.sort((a,b)=>a-b).map((id)=>{
    const prev = initial.get(id); const cur = current.get(id); const subj = find(id);
    return {
      id,
      code: subj?.code ?? `#${id}`,
      name: subj?.name ?? "Unknown subject",
      oldProf: prev?.prof,
      newProf: cur?.prof,
      oldWill: prev?.will,
      newWill: cur?.will,
      strand: subj?.strand,
      gradeLevel: subj?.gradeLevel,
    };
  });

  return { addedRows, removedRows, updatedRows, addedIds: added, removedIds: removed, updatedIds: updated };
}
