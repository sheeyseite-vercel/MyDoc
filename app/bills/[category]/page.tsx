import CategoryView from "@/components/CategoryView";
import { CATS } from "@/lib/bills";
export const dynamicParams = false;
export function generateStaticParams() { return CATS.map(([c]) => ({ category: c })); }
export default async function Page({ params }: { params: Promise<{ category: string }> }) { const { category } = await params; return <CategoryView category={category} />; }
