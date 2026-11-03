import { AudienceDetailScreen } from "@/components/screens/audience-detail";

export default async function Page({ params }: PageProps<"/doelgroepen/[id]">) {
  const { id } = await params;
  return <AudienceDetailScreen id={id} />;
}
