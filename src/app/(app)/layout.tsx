import { Nav } from "@/components/nav";
import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/queries";

/** Tudo aqui dentro exige sessão. Sem ela, `requireUser` manda pro login. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const categories = await getCategories(user.id);

  return (
    <>
      <Nav categories={categories} email={user.email} />
      <Shell>{children}</Shell>
    </>
  );
}
