import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";

interface Professor {
  id: string;
  name: string;
  username?: string;
  password?: string;
}

interface CredentialsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professors: Professor[];
}

const CredentialsViewer = ({
  open = false,
  onOpenChange,
  professors = [],
}: CredentialsViewerProps) => {
  const [visiblePasswords, setVisiblePasswords] = useState<{
    [id: string]: boolean;
  }>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Professor Credentials
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full pr-4">
          <div className="space-y-4">
            {professors.length > 0 ? (
              professors.map((professor) => (
                <div
                  key={professor.id}
                  className="p-3 border rounded-md bg-secondary/20"
                >
                  <div className="font-medium">{professor.name}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div className="flex items-center">
                      <span className="text-muted-foreground mr-2">
                        Username:
                      </span>
                      <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                        {professor.username || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-muted-foreground mr-2">
                        Password:
                      </span>
                      <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded mr-2">
                        {visiblePasswords[professor.id]
                          ? professor.password
                          : professor.password
                          ? "•".repeat(professor.password.length)
                          : ""}
                      </span>
                      {professor.password && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(professor.id)}
                          className="focus:outline-none"
                          aria-label={
                            visiblePasswords[professor.id]
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {visiblePasswords[professor.id] ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No professor credentials available
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CredentialsViewer;
