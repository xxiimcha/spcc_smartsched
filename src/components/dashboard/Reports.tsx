import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Users, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import axios from "axios";

interface Professor { id: string; name: string; email?: string; subjectCount?: number; }
interface Subject { id: string; code: string; name: string; room_id?: string; }

const PAGE_SIZE = 5;

const Reports = () => {
  const [teachersWithoutSubjects, setTeachersWithoutSubjects] = useState<Professor[]>([]);
  const [subjectsWithoutRooms, setSubjectsWithoutRooms] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tPage, setTPage] = useState(1);
  const [sPage, setSPage] = useState(1);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get("https://spcc-scheduler.site/dashboard/availability_checker.php", {
        params: { action: "all" },
      });
      if (data?.success) {
        setTeachersWithoutSubjects(data.data?.teachers_without_subjects ?? []);
        setSubjectsWithoutRooms(data.data?.subjects_without_rooms ?? []);
        setTPage(1);
        setSPage(1);
      } else {
        setError(data?.message || "Failed to load reports");
        setTeachersWithoutSubjects([]);
        setSubjectsWithoutRooms([]);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports");
      setTeachersWithoutSubjects([]);
      setSubjectsWithoutRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const tPaginated = useMemo(() => paginate(teachersWithoutSubjects, tPage, PAGE_SIZE), [teachersWithoutSubjects, tPage]);
  const sPaginated = useMemo(() => paginate(subjectsWithoutRooms, sPage, PAGE_SIZE), [subjectsWithoutRooms, sPage]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* TEACHERS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Teachers Without Subjects</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tPaginated.pageItems.length > 0 ? (
                      tPaginated.pageItems.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.email || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          All teachers have subjects assigned
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationFooter
                page={tPage}
                totalPages={tPaginated.totalPages}
                total={tPaginated.total}
                start={tPaginated.startIdx}
                end={tPaginated.endIdx}
                onFirst={() => setTPage(1)}
                onPrev={() => setTPage((p) => Math.max(1, p - 1))}
                onNext={() => setTPage((p) => Math.min(tPaginated.totalPages, p + 1))}
                onLast={() => setTPage(tPaginated.totalPages)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* SUBJECTS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subjects Without Classrooms</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sPaginated.pageItems.length > 0 ? (
                      sPaginated.pageItems.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.code}</TableCell>
                          <TableCell>{s.name}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4">
                          All subjects have classrooms assigned
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationFooter
                page={sPage}
                totalPages={sPaginated.totalPages}
                total={sPaginated.total}
                start={sPaginated.startIdx}
                end={sPaginated.endIdx}
                onFirst={() => setSPage(1)}
                onPrev={() => setSPage((p) => Math.max(1, p - 1))}
                onNext={() => setSPage((p) => Math.min(sPaginated.totalPages, p + 1))}
                onLast={() => setSPage(sPaginated.totalPages)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;

/* ---------- helpers/components ---------- */

function paginate<T>(items: T[], page: number, size: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const startIdx = total === 0 ? 0 : (current - 1) * size + 1;
  const endIdx = Math.min(current * size, total);
  const pageItems = items.slice((current - 1) * size, (current - 1) * size + size);
  return { pageItems, total, startIdx, endIdx, totalPages };
}

type FooterProps = {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
};

const PaginationFooter: React.FC<FooterProps> = ({
  page, totalPages, total, start, end, onFirst, onPrev, onNext, onLast,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
    <div className="text-xs text-muted-foreground">
      Showing <span className="font-medium">{total === 0 ? 0 : start}</span>–
      <span className="font-medium">{end}</span> of{" "}
      <span className="font-medium">{total}</span>
    </div>
    <div className="flex items-center gap-2">
      <button className="border rounded px-2 py-1 disabled:opacity-50" onClick={onFirst} disabled={page === 1 || total === 0} title="First">
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button className="border rounded px-2 py-1 disabled:opacity-50" onClick={onPrev} disabled={page === 1 || total === 0} title="Previous">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs px-2">
        Page <span className="font-medium">{page}</span> of{" "}
        <span className="font-medium">{totalPages}</span>
      </span>
      <button className="border rounded px-2 py-1 disabled:opacity-50" onClick={onNext} disabled={page === totalPages || total === 0} title="Next">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button className="border rounded px-2 py-1 disabled:opacity-50" onClick={onLast} disabled={page === totalPages || total === 0} title="Last">
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);
