import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/serverUser";
import { getDefaultRouteForRole } from "@/lib/roleRouting";
import GenerateQRClient from '@/app/(app)/qr-registration/GenerateQRClient';

export default async function QRRegistrationPage() {
  const session = await getServerUser();
  if (!session) {
    redirect("/signin");
  }

  const nextRoute = getDefaultRouteForRole(session.claims?.role, {
    companySlug: session.claims?.companySlug ?? null,
    branchSlug: session.claims?.branchSlug ?? null,
    cashierSlug: session.claims?.cashierSlug ?? null,
  });

  if (nextRoute !== "/qr-registration") {
    redirect(nextRoute);
  }

  return <GenerateQRClient />;
}
