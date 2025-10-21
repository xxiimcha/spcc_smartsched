import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SuccessMessage from "../popupmsg/SuccessMessage";
import ErrorMessage from "../popupmsg/ErrorMessage";

interface SubjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Subject, "id">) => void;
  initialData?: Omit<Subject, "id">;
}

interface Subject {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type?: string;    
  strand?: string;     
  gradeLevel: string;  
}

// dropdown options
const TYPE_OPTIONS = ["Core", "Contextualized", "Specialized"];
const STRAND_OPTIONS = ["ICT", "STEM", "ABM", "HUMSS", "GAS", "HE", "IA"];
const GRADE_OPTIONS = ["11", "12"];

const SubjectForm: React.FC<SubjectFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}) => {
  const [code, setCode] = useState<string>(initialData?.code || "");
  const [name, setName] = useState<string>(initialData?.name || "");
  const [description, setDescription] = useState<string>(
    initialData?.description || ""
  );
  const [type, setType] = useState<string>(initialData?.type || TYPE_OPTIONS[0]);
  const [strand, setStrand] = useState<string>(
    initialData?.strand || STRAND_OPTIONS[0]
  );
  const [gradeLevel, setGradeLevel] = useState<string>(
    (initialData as any)?.gradeLevel || GRADE_OPTIONS[0]
  );

  // feedback dialogs
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // reset when opening / initialData changes
  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || "");
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setType(initialData.type || TYPE_OPTIONS[0]);
      setStrand(initialData.strand || STRAND_OPTIONS[0]);
      setGradeLevel((initialData as any).gradeLevel || GRADE_OPTIONS[0]);
    } else if (open) {
      setCode("");
      setName("");
      setDescription("");
      setType(TYPE_OPTIONS[0]);
      setStrand(STRAND_OPTIONS[0]);
      setGradeLevel(GRADE_OPTIONS[0]);
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    if (!code.trim() || !name.trim()) {
      setErrorMessage("Subject code and name are required.");
      setIsErrorOpen(true);
      return;
    }
    if (!gradeLevel) {
      setErrorMessage("Grade level is required.");
      setIsErrorOpen(true);
      return;
    }

    try {
      onSubmit({
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || "",
        type,
        strand,
        gradeLevel, // REQUIRED
      } as Omit<Subject, "id">);

      setSuccessMessage(
        initialData ? "Subject updated successfully!" : "Subject added successfully!"
      );
      setIsSuccessOpen(true);
      setTimeout(() => onOpenChange(false), 500);
    } catch {
      setErrorMessage("Failed to save subject. Please try again.");
      setIsErrorOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle>{initialData ? "Edit Subject" : "Add New Subject"}</DialogTitle>
            <DialogDescription>
              {initialData
                ? "Update the subject information below."
                : "Fill in the details to create a new subject."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Code
              </label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter subject code"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter subject name"
              />
            </div>

            {/* Row of Type + Strand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Strand</label>
                <Select value={strand} onValueChange={setStrand}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRAND_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grade Level <span className="text-red-500">*</span>
              </label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter subject description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit}>
              {initialData ? "Update Subject" : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuccessMessage isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} message={successMessage} />
      <ErrorMessage isOpen={isErrorOpen} onClose={() => setIsErrorOpen(false)} message={errorMessage} />
    </>
  );
};

export default SubjectForm;
