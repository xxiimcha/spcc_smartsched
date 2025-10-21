import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

/* ---------------- Schema ---------------- */
const formSchema = z.object({
  number: z
    .string()
    .regex(/^\d+$/, "Room number must contain digits only")
    .refine((v) => +v > 0, { message: "Room number must be a positive number" }),
  type: z.enum(["Lecture", "Laboratory"]),
  capacity: z
    .string()
    .regex(/^\d+$/, "Capacity must be a number")
    .refine((v) => +v >= 10 && +v <= 50, {
      message: "Capacity must be between 10 and 50",
    }),
  section_id: z.string().optional(),
});

interface Room {
  id: number;
  number: number;
  type: string;
  capacity: number;
  section_id?: number;
}

interface RoomFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: () => void;
  room?: Room | null;
}

const allowOnlyDigits: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
  if (allowed.includes(e.key)) return;
  if (/^\d$/.test(e.key)) return;
  e.preventDefault(); 
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const RoomForm: React.FC<RoomFormProps> = ({
  open = false,
  onOpenChange,
  onSubmit,
  room,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      type: "Lecture",
      capacity: "",
      section_id: "",
    },
  });

  /* Reset form whenever dialog opens or room changes */
  React.useEffect(() => {
    reset({
      number: room?.number ? String(room.number) : "",
      type: (room?.type as "Lecture" | "Laboratory") ?? "Lecture",
      capacity: room?.capacity ? String(room.capacity) : "",
      section_id: room?.section_id ? String(room.section_id) : "",
    });
  }, [room, open, reset]);

  /* Live watch for warning states */
  const numberValue = watch("number");
  const capacityValue = watch("capacity");

  const invalidNumber =
    numberValue && !/^\d+$/.test(numberValue)
      ? "Room number should contain digits only."
      : null;

  const invalidCapacity =
    capacityValue && (!/^\d+$/.test(capacityValue) || +capacityValue < 10 || +capacityValue > 50)
      ? "Capacity must be between 10 and 50 only."
      : null;

  const onSubmitForm = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        number: parseInt(values.number, 10),
        type: values.type,
        capacity: parseInt(values.capacity, 10),
        section_id: values.section_id ? parseInt(values.section_id, 10) : null,
      };

      const resp = room
        ? await axios.put(`https://spcc-scheduler.site/rooms.php?id=${room.id}`, payload)
        : await axios.post("https://spcc-scheduler.site/rooms.php", payload);

      if (resp.data.success || resp.data.status === "success") {
        reset();
        onSubmit?.();
        onOpenChange?.(false);
      } else {
        throw new Error(resp.data.message || "Failed to save room");
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to save room. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={room?.id ?? "new"}
        className="max-w-md rounded-2xl bg-gray-100 p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-2">
            {room ? "Edit Room" : "Create New Room"}
          </DialogTitle>
          <DialogDescription>
            {room
              ? "Update the room information below."
              : "Fill in the details to create a new room."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Room number */}
          <div className="space-y-2">
            <Label htmlFor="room-number">Room Number</Label>
            <Input
              id="room-number"
              {...register("number")}
              className={`rounded-lg ${
                invalidNumber ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
              inputMode="numeric"
              pattern="\d*"
              onKeyDown={allowOnlyDigits}
              placeholder="e.g., 301"
            />
            {invalidNumber && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {invalidNumber}
              </p>
            )}
            {errors.number && (
              <p className="text-xs text-red-600">{errors.number.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            {/* Room type */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="room-type">Room Type</Label>
              <select
                id="room-type"
                {...register("type")}
                className="rounded-lg w-full h-10 px-2 border border-gray-300 bg-white"
              >
                <option value="Lecture">Lecture</option>
                <option value="Laboratory">Laboratory</option>
              </select>
            </div>

            {/* Capacity */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="room-capacity">Capacity</Label>
              <Input
                id="room-capacity"
                type="number"
                {...register("capacity")}
                className={`rounded-lg ${
                  invalidCapacity
                    ? "border-amber-500 focus-visible:ring-amber-500"
                    : ""
                }`}
                min={10}
                max={50}
                step={1}
                inputMode="numeric"
                onKeyDown={allowOnlyDigits}
                onBlur={(e) => {
                  const raw = e.currentTarget.value;
                  if (!raw) return;
                  const n = clamp(parseInt(raw, 10), 10, 50);
                  setValue("capacity", String(n), { shouldValidate: true });
                }}
                placeholder="10–50"
              />
              {invalidCapacity && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {invalidCapacity}
                </p>
              )}
              {errors.capacity && (
                <p className="text-xs text-red-600">{errors.capacity.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg bg-gray-400 text-white hover:bg-gray-500"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-lg bg-black text-white hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : room ? "Save Changes" : "Add Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomForm;
