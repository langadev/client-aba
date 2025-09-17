import { type JSX } from "react";
import { Routes, Route } from "react-router-dom";
import PsychologistDashboard from "@/screens/Psychologist/PsychologistDashboard";
import PsychologistChildren from "@/screens/Psychologist/PsychologistChildren";

const PsychologistRoutes = (): JSX.Element => {
  return (
   <div>
    <Routes>

      <Route index element={<PsychologistChildren/>} />
      {/* Add more psychologist-specific routes here */}
      <Route path="/children/:id" element={<PsychologistDashboard />} />
    </Routes>
   </div>

      
  );
};

export default PsychologistRoutes;
