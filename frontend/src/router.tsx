import { createBrowserRouter } from "react-router-dom";
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
  // Public routes
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },

  // Admin routes (protected - to be wrapped later)
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

  // Participant routes (protected - to be wrapped later)
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

  // Catch-all
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
