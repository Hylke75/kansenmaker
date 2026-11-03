import { SessionDetailScreen } from "@/components/screens/session-detail";

export default async function Page({ params }: PageProps<"/sessies/[id]">) {
  const { id } = await params;
  return <SessionDetailScreen id={id} />;
}
