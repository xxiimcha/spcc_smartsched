import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button"; // Changed to use your UI button component

interface ErrorMessageProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function ErrorMessage({
  isOpen,
  onClose,
  message,
}: ErrorMessageProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-red-600">Error</DialogTitle>
        </DialogHeader>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-gray-700">{message}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose} variant="destructive">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
