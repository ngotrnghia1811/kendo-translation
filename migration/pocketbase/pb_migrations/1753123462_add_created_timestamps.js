/// <reference path="../pb_data/types.d.ts" />

/**
 * Add a `created` autodate field to the three cooperation collections.
 *
 * Root cause of the "Invalid Date" display bug: the base collections
 * `segment_comments`, `segment_suggestions`, and `qa_issues` were authored
 * WITHOUT the standard `created`/`updated` system timestamps (verified
 * against the live schema — the only system field present is `id`). The
 * frontend was reading a Supabase-era `created_at` field that never existed
 * in PocketBase, so `new Date(undefined)` rendered "Invalid Date".
 *
 * This migration restores a `created` timestamp (auto-populated on create,
 * NOT on update) so NEW comments/suggestions/QA issues carry a real
 * creation time going forward. Existing records keep an empty `created`
 * until re-saved — the frontend treats an empty value as "no timestamp"
 * rather than rendering "Invalid Date".
 *
 * NOTE: must be applied to the remote PocketBase server (copy into its
 * `pb_migrations` dir + restart, or `./pocketbase migrate up`) — it does not
 * auto-apply to the live instance from this repo.
 */

migrate((app) => {
    for (const name of ["segment_comments", "segment_suggestions", "qa_issues"]) {
        const collection = app.findCollectionByNameOrId(name);

        const hasCreated = collection.fields.some((f) => f.name === "created");
        if (!hasCreated) {
            collection.fields.add(
                new AutodateField({
                    name: "created",
                    onCreate: true,
                    onUpdate: false,
                })
            );
            app.save(collection);
        }
    }
});
