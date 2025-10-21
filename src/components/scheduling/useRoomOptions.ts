import { useEffect, useMemo, useRef, useState } from "react";
import { Room, Section } from "@/types/scheduling";

export function useRoomOptions(params: {
  scheduleType: "Onsite" | "Online";
  roomType: "Lecture" | "Laboratory";
  sectionId?: string;
  sections: Section[];
  rooms: Room[];
  clearRoom: () => void;              // should be stable (useCallback)
  getSelectedRoomId: () => string | undefined; // should be stable (useCallback)
}) {
  const {
    scheduleType,
    roomType,
    sectionId,
    sections,
    rooms,
    clearRoom,
    getSelectedRoomId,
  } = params;

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === sectionId),
    [sections, sectionId]
  );

  // Keep stable refs for the functions so we don't need to depend on them
  const clearRoomRef = useRef(clearRoom);
  const getSelectedRoomIdRef = useRef(getSelectedRoomId);
  useEffect(() => { clearRoomRef.current = clearRoom; }, [clearRoom]);
  useEffect(() => { getSelectedRoomIdRef.current = getSelectedRoomId; }, [getSelectedRoomId]);

  useEffect(() => {
    const current = getSelectedRoomIdRef.current?.();

    // Online → hide room controls; only clear if there is a value
    if (scheduleType !== "Onsite") {
      if (availableRooms.length) setAvailableRooms([]);
      if (current) clearRoomRef.current();
      return;
    }

    if (roomType === "Laboratory") {
      const labs = rooms.filter((r) => r.type === "Laboratory");
      setAvailableRooms(labs);

      // Clear only if we currently have a room and it's not a lab
      if (current && !labs.some((r) => r.id === current)) {
        clearRoomRef.current();
      }
      return;
    }

    // Lecture: only the section's assigned lecture rooms are valid
    const lectureForSection =
      selectedSection?.rooms?.filter((r) => r.type === "Lecture") ?? [];
    setAvailableRooms(lectureForSection);

    // Clear only if we currently have a room and it's not in the allowed list
    if (current && !lectureForSection.some((r) => r.id === current)) {
      clearRoomRef.current();
    }
  }, [scheduleType, roomType, selectedSection, rooms]); // NOTE: no function deps

  return { availableRooms, selectedSection };
}
