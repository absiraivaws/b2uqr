
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/serverUser";
import { getDefaultRouteForRole } from "@/lib/roleRouting";
import GenerateQRClient from "./GenerateQRClient";

export default async function GenerateQRPage() {
  const session = await getServerUser();
  if (!session) {
    redirect("/signin");
  }

  const nextRoute = getDefaultRouteForRole(session.claims?.role, {
    companySlug: session.claims?.companySlug ?? null,
    branchSlug: session.claims?.branchSlug ?? null,
    cashierSlug: session.claims?.cashierSlug ?? null,
  });

  if (nextRoute !== "/generate-qr") {
    redirect(nextRoute);
  }

  return <GenerateQRClient />;
}
