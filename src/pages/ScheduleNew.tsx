import { useNavigate } from "react-router-dom";
import ScheduleForm from "@/components/scheduling/ScheduleForm";

export default function ScheduleNew() {
  const navigate = useNavigate();
  return (
    <ScheduleForm
      title="Create New Schedule"
      onSubmit={() => navigate("/scheduling")}
      onCancel={() => navigate("/scheduling")}
    />
  );
}
