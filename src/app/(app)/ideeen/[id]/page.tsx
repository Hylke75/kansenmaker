import { IdeaDetailScreen } from "@/components/screens/idea-detail";

export default async function Page({ params }: PageProps<"/ideeen/[id]">) {
  const { id } = await params;
  return <IdeaDetailScreen id={id} />;
}
