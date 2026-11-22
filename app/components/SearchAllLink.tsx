"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SEARCH_WORDS, searchHref } from "@/lib/search-core";

// Unit VW124 (Q-A 3:117.4 row 5): the link "Search all" next to the box of the Reader dashboard /read. It opens /search with the same words.
// Without script the link carries the words of the last search. With script it takes the words that are in the box now, also when the person did not press Search yet.
export default function SearchAllLink({ query }: { query: string }) {
  const router = useRouter();
  return (
    <Link
      href={searchHref(query)}
      prefetch={false}
      data-search-all
      className="inline-flex min-h-[44px] items-center text-accent underline md:min-h-0"
      onClick={(e) => {
        const box = document.getElementById("read-q") as HTMLInputElement | null;
        if (!box) return;
        e.preventDefault();
        router.push(searchHref(box.value.trim().slice(0, 80)));
      }}
    >
      {SEARCH_WORDS.searchAll}
    </Link>
  );
}
