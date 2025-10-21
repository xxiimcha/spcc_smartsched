import React from "react";
import ProfessorManagement from "@/components/professors/ProfessorManagement";
import RoomManagement from "@/components/rooms/RoomManagement";

const Rooms = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
      </div>

      <RoomManagement />
    </div>
  );
};

export default Rooms;
