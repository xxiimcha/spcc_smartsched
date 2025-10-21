import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessMessageProps {
  isOpen: boolean;

  onClose: () => void;
  message: string;
}

export default function SuccessMessage({
  isOpen,
  onClose,
  message,
}: SuccessMessageProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-green-600">Success!</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-700">{message}</p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
