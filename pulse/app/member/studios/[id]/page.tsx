import { StudioDetailView } from "./studio-detail-view";
import { STUDIO_IDS } from "@/lib/mock/seed";

/** Pre-render one page per seeded studio for static export (Netlify, etc.). */
export function generateStaticParams() {
  return STUDIO_IDS.map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function StudioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudioDetailView id={id} />;
}
