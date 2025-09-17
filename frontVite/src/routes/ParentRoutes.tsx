import { type JSX } from "react";
import { Routes, Route} from "react-router-dom";
import EditChildPage from "@/screens/parent/EditChild";
import MyChildren from "@/screens/parent/MyChildren";
import EditUserPage from "@/screens/auth/EditUserPage";
import UserProfilePage from "@/screens/auth/UserProfilePage";
import ParentDashboard from "@/screens/parent/ParentDashboard";
import CreateChildPage from "@/screens/parent/createChild";

const ParentRoutes = (): JSX.Element => {
  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      
        
          
            <Routes>
              <Route index element={<MyChildren/>} />

              <Route path="parent/children/edit/:id" element={<EditChildPage />} />
               <Route path="profile/:id" element={<UserProfilePage />} />
               <Route path="profile/edit/:id" element={<EditUserPage />} />
               <Route path="children/edit/:id" element={<EditChildPage />} />
               <Route path="children/add" element={<CreateChildPage />} />
               <Route path="children/:id" element={< ParentDashboard/>} />
            </Routes>
          
      
      </div>

  );
};

export default ParentRoutes;
