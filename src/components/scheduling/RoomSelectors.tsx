import React from "react";
import type { Control } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Room, Section } from "@/types/scheduling";

interface Props {
  control: Control<any>;
  isOnsite: boolean;
  loadingRooms: boolean;
  roomTypeValue: "Lecture" | "Laboratory";
  availableRooms: Room[];
  selectedSection?: Section;
  onRoomTypeChange: (v: "Lecture" | "Laboratory") => void;
}

const RoomSelectors: React.FC<Props> = ({
  control,
  isOnsite,
  loadingRooms,
  roomTypeValue,
  availableRooms,
  selectedSection,
  onRoomTypeChange,
}) => {
  if (!isOnsite) return null;

  const assignedLectureRooms =
    selectedSection?.rooms?.filter((r) => r.type === "Lecture") ?? [];
  const assigned = assignedLectureRooms[0];

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Choose room type only when Onsite */}
      <FormField
        control={control}
        name="roomType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Room Type</FormLabel>
            <Select
              onValueChange={(v: "Lecture" | "Laboratory") => {
                field.onChange(v);
                onRoomTypeChange(v);
              }}
              defaultValue={field.value || "Lecture"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Lecture">Lecture</SelectItem>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Right side: either the lab dropdown or the fixed lecture room info */}
      {roomTypeValue === "Laboratory" ? (
        <FormField
          control={control}
          name="room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Laboratory Room</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    {loadingRooms ? (
                      <span>Loading rooms...</span>
                    ) : (
                      <SelectValue placeholder="Select a laboratory room" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.number}
                      <Badge variant="outline" className="ml-2">
                        {room.capacity} capacity
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <div className="space-y-2">
          <FormLabel>Lecture Room</FormLabel>
          {!selectedSection ? (
            <div className="text-sm text-muted-foreground">
              Select a section first.
            </div>
          ) : assigned ? (
            <div className="rounded-md border p-3 text-sm">
              Room {assigned.number}{" "}
              <Badge variant="outline" className="ml-2">
                {assigned.capacity} capacity
              </Badge>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              This section has no assigned lecture room.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomSelectors;
