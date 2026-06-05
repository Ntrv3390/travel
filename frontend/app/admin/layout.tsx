import type { Metadata } from "next";
import { AdminLayout } from "./AdminLayout";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard | Triipzy",
    template: "%s | Triipzy Admin",
  },
  description: "Triipzy admin dashboard for managing bookings, products, and users.",
  robots: "noindex, nofollow",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
