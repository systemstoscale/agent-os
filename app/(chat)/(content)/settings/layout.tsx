import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { SettingsNav } from "@/components/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>
      <SettingsNav />
      <div className="py-6">{children}</div>
    </div>
  );
}
