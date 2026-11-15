import { titleOf, type WorkTitle } from "@/lib/profile-rules";

// Title of a work in a list of the profile page (unit VW105). Same form as the Reader dashboard /read (components/ReaderRows.tsx WorkItem):
// the English title first, the Japanese title next to it in muted text, the work ID when the catalog has no title.
// The app holds no romaji for a work title (only for the term marks of a page), so no romaji is shown. [unit default A8 of VW105]
export default function ProfileTitle({ itemId, titles }: { itemId: string; titles: Record<string, WorkTitle> }) {
  const t = titleOf(itemId, titles[itemId]);
  return (
    <>
      <span data-work-title>{t.main}</span>
      {t.ja ? (
        <span lang="ja" className="font-ja ml-2 text-sm font-normal text-muted">
          {t.ja}
        </span>
      ) : null}
    </>
  );
}
