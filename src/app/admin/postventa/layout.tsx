import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";

export default async function PostSaleLayout({ children }: { children: React.ReactNode }) {
  await requirePostSaleStaff();
  return children;
}
