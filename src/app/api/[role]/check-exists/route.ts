import { handleCheckExists } from '@/lib/roleHandlers';

export async function POST(req: Request, { params }: { params: { role: string } }) {
  const { role } = await params;
  return handleCheckExists(req, role);
}
