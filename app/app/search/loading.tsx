import LoadingPopup from "@/components/LoadingPopup";

// Unit VW124: a dynamic route needs a loading.tsx, so that a click shows an answer at once (the same as app/read/loading.tsx).
export default function Loading() {
  return <LoadingPopup route />;
}
