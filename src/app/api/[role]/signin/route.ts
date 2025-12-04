import { handleSignin } from '@/lib/roleHandlers';

export async function POST(req: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  return handleSignin(req, role);
}
