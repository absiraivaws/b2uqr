export default async function CompanySlugIndex({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold">Company Home</h1>
      <p>company home</p>
      <p className="mt-2 text-sm text-muted-foreground">Slug: {companySlug}</p>
    </main>
  );
}
