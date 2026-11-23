import LoadingPopup from "@/components/LoadingPopup";

// Unit VW126: a dynamic route needs a loading.tsx, so that a click shows an answer at once (the same as app/search/loading.tsx).
export default function Loading() {
  return <LoadingPopup route />;
}
