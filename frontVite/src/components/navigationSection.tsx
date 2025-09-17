import { type JSX } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDaysIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  TargetIcon,
} from "lucide-react";

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    badge: null,
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: CalendarIcon,
    badge: null,
  },
  {
    id: "goals",
    label: "Goals",
    icon: TargetIcon,
    badge: null,
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileTextIcon,
    badge: null,
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: CalendarDaysIcon,
    badge: null,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCardIcon,
    badge: null,
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageSquareIcon,
    badge: 2,
  },
];

export const NavigationSection = (): JSX.Element => {
  return (
    <nav className="fixed lg:sticky top-0 left-0 z-40 w-full lg:w-64 h-16 lg:h-screen bg-white shadow-sm border-b lg:border-r border-gray-200 overflow-x-auto lg:overflow-x-visible">
      <div className="flex flex-row lg:flex-col h-full lg:pt-6 lg:pb-6 px-4 lg:px-6">
        {/* Logo for mobile */}
        <div className="lg:hidden flex items-center mr-4">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
            <LayoutDashboardIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex flex-row lg:flex-col items-center lg:items-start gap-1 lg:gap-2 flex-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;

            return (
              <NavLink
                key={item.id}
                to={`/${item.id}`}
                className={({ isActive }) =>
                  `flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all duration-200 flex-shrink-0 relative ${
                    isActive
                      ? "bg-blue-50 text-blue-600 lg:border-r-2 lg:border-r-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <IconComponent className="w-5 h-5 lg:w-4 lg:h-4" />

                <span className="ml-2 lg:ml-3 text-sm font-medium hidden lg:block">
                  {item.label}
                </span>

                {item.badge && (
                  <span
                    className={`ml-2 rounded-full text-xs px-1.5 py-0.5 font-medium ${
                      item.badge
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Mobile badge indicator */}
                {item.badge && (
                  <span className="lg:hidden absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User profile at bottom on desktop */}
        <div className="hidden lg:flex flex-col mt-auto pt-4 border-t border-gray-200">
          <div className="flex items-center px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">JD</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Dr. Jane Doe</p>
              <p className="text-xs text-gray-500">Psychologist</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
