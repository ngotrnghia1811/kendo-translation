/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 page_runs: run columns and a read rule for every signed-in user.
 *
 * Reason (unit S2C, round 56 answers 3 to 5, Q-A 2026-10-28 l163-165):
 *   - The run list of the human-translation-view shows the start time and the
 *     status of each run. It must read these two values without the snapshot.
 *     So page_runs gets the text fields `started_utc` and `status`.
 *   - The reader keeps the read-only view (round 55 answer 6). So the list
 *     rule and the view rule of page_runs become: every signed-in user.
 *   - createRule, updateRule and deleteRule stay null (superuser only).
 *
 * Rules for this file:
 *   - Add a field only if it is missing.
 *   - If page_runs does not exist, print a line and change nothing.
 *   - Safe to run twice.
 *
 * Down function (soft, like the other v2 migrations): put back the old list
 * rule and view rule of migration 1793300001 (translator or admin).
 * It keeps the two fields and all data. No data is dropped.
 */

const SIGNED_IN = '@request.auth.id != ""';
const WRITER_OR_ADMIN = '@request.auth.role = "translator" || @request.auth.role = "admin"';

migrate((app) => {
    let runs;
    try {
        runs = app.findCollectionByNameOrId("page_runs");
    } catch (_) {
        console.log("v2 migration: collection page_runs is missing, left as it is");
        return;
    }

    if (!runs.fields.getByName("started_utc")) {
        runs.fields.add(new TextField({ name: "started_utc" }));
    }
    if (!runs.fields.getByName("status")) {
        runs.fields.add(new TextField({ name: "status" }));
    }

    runs.listRule = SIGNED_IN;
    runs.viewRule = SIGNED_IN;
    // null = only a superuser can do the action.
    runs.createRule = null;
    runs.updateRule = null;
    runs.deleteRule = null;

    app.save(runs);
}, (app) => {
    let runs;
    try {
        runs = app.findCollectionByNameOrId("page_runs");
    } catch (_) {
        return;
    }
    runs.listRule = WRITER_OR_ADMIN;
    runs.viewRule = WRITER_OR_ADMIN;
    app.save(runs);
});
