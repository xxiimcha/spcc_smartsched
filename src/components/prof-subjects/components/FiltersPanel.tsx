import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

type Props = {
  query: string;
  setQuery: (v: string) => void;
  gradeLevel: string;
  setGradeLevel: (v: string) => void;
  selectedCount: number;
  onReset: () => void;
  gradeOptions: readonly string[];
};

export default function FiltersPanel({
  query, setQuery, gradeLevel, setGradeLevel, selectedCount, onReset, gradeOptions
}: Props) {
  return (
    <Card className="h-min xl:sticky xl:top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or code" value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Grade Level</div>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {gradeOptions.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <Separator />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Selected: <span className="font-medium">{selectedCount}</span>
          </div>
          <Button variant="outline" onClick={onReset}>Reset Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
