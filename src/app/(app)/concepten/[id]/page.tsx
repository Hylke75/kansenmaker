import { ConceptDetailScreen } from "@/components/screens/concept-detail";

export default async function Page({ params, searchParams }: PageProps<"/concepten/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <ConceptDetailScreen id={id} initialTab={typeof tab === "string" ? tab : undefined} />;
}
