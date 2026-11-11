import { redirect } from "next/navigation";
export default async function Old({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/doc?id=${id}`); }
