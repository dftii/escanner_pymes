import type { Metadata } from 'next';
import { HomePage } from '@/components/HomePage';
import { localeFrom, pageMetadata } from '@/lib/pageMeta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(await localeFrom(params), '/');
}

export default async function Home({ params }: Props) {
  return <HomePage locale={await localeFrom(params)} />;
}
