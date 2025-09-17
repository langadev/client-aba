import { Routes, Route } from "react-router-dom";
import CreateUserPage from "@/screens/auth/register";
import EditUserPage from "@/screens/auth/EditUserPage";
import EditChildPage from "@/screens/parent/EditChild";
import UserProfilePage from "@/screens/auth/UserProfilePage";
import CreateChildPage from "@/screens/parent/createChild";
import type { JSX } from "react";
import AdminDashboard from "@/screens/admin/AdminDashboad";

const AdminRoutes = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="users/create" element={<CreateUserPage />} />
      <Route path="children/create" element={<CreateChildPage />} />
      <Route path="users/edit/:id" element={<EditUserPage />} />
      <Route path="children/edit/:id" element={<EditChildPage />} />
      <Route path="users/profile/:id" element={<UserProfilePage />} />
    </Routes>
  );
};

export default AdminRoutes;
 