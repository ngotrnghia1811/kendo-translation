/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 rules for the reader pages (unit RC1, round 63 answers 3 and 7, Q-A 2026-10-28 l307 and l311).
 *
 * 1. page_runs list and view go back to translator or admin (the rule of migration 1793300001).
 *    Migration 1793300003 opened them to every signed-in user. Then a reader could read the verdict, the score, and the TL_3 panel
 *    through the API. That conflicts with VISION-viewer l232 and l239 (readers never see the research layer).
 *    Round 63 answer 3: "Fix in the reader code unit (Recommended)". Readers use reader_pages instead.
 * 2. user_settings.theme takes the values light, dark, sepia, solarized-light, and solarized-dark (round 63 answer 7: Sepia and two Solarized themes).
 *
 * Safe to run twice: the file sets the same rule and the same list again.
 *
 * Down function: put the page_runs rule of migration 1793300003 back (every signed-in user). Keep the theme values (a stored value must stay valid).
 */

const STAFF = '@request.auth.role = "translator" || @request.auth.role = "admin"';
const SIGNED_IN = '@request.auth.id != ""';
const THEMES = ["light", "dark", "sepia", "solarized-light", "solarized-dark"];

migrate((app) => {
    try {
        const runs = app.findCollectionByNameOrId("page_runs");
        runs.listRule = STAFF;
        runs.viewRule = STAFF;
        app.save(runs);
    } catch (_) {
        console.log("v2 migration: collection page_runs is missing, left as it is");
    }
    try {
        const settings = app.findCollectionByNameOrId("user_settings");
        const theme = settings.fields.getByName("theme");
        if (theme) {
            theme.values = THEMES;
            app.save(settings);
        }
    } catch (_) {
        console.log("v2 migration: collection user_settings is missing, left as it is");
    }
}, (app) => {
    try {
        const runs = app.findCollectionByNameOrId("page_runs");
        runs.listRule = SIGNED_IN;
        runs.viewRule = SIGNED_IN;
        app.save(runs);
    } catch (_) {
        // page_runs is missing: nothing to put back.
    }
});
