import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  clearing: boolean;
  onClear: () => void;
};

export default function ClearDialog({ open, setOpen, clearing, onClear }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all preferences?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all saved subject preferences from your account. You can set them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onClear} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
