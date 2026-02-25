import { createBrowserRouter, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import GroupDetailPage from "@/pages/GroupDetailPage";
import PollDetailPage from "@/pages/PollDetailPage";
import ParticipantDashboardPage from "@/pages/ParticipantDashboardPage";
import PollResultsPage from "@/pages/PollResultsPage";
import MyVotesPage from "@/pages/MyVotesPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * Root wrapper that provides authentication context to all routes.
 * This must be inside the router tree so child components can
 * use both useAuth and useNavigate.
 */
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

/**
 * Application router configuration.
 *
 * Public routes:
 *   /              - Participant login
 *   /admin/login   - Admin login
 *
 * Protected (admin) routes:
 *   /admin              - Admin dashboard
 *   /admin/groups/:id   - Group detail
 *   /admin/polls/:id    - Poll detail
 *
 * Protected (participant) routes:
 *   /polls              - Participant dashboard
 *   /polls/:id/results  - Poll results
 *   /my-votes           - Own votes history
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      {
        path: "/",
        element: <LoginPage />,
      },
      {
        path: "/admin/login",
        element: <AdminLoginPage />,
      },

      // Admin routes (protected)
      {
        element: <ProtectedRoute requiredRole="ADMIN" />,
        children: [
          {
            element: <Layout />,
            children: [
              {
                path: "/admin",
                element: <AdminDashboardPage />,
              },
              {
                path: "/admin/groups/:id",
                element: <GroupDetailPage />,
              },
              {
                path: "/admin/polls/:id",
                element: <PollDetailPage />,
              },
            ],
          },
        ],
      },

      // Participant routes (protected)
      {
        element: <ProtectedRoute requiredRole="PARTICIPANT" />,
        children: [
          {
            element: <Layout />,
            children: [
              {
                path: "/polls",
                element: <ParticipantDashboardPage />,
              },
              {
                path: "/polls/:id/results",
                element: <PollResultsPage />,
              },
              {
                path: "/my-votes",
                element: <MyVotesPage />,
              },
            ],
          },
        ],
      },

      // Catch-all
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
