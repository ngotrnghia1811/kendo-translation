/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 own_translations: the agree tick.
 *
 * Reason (round 58 answer 4, Q-A 2026-10-28 l202: "Correct, new agree field (Recommended)"):
 *   - A translator ticks a row to say "I agree with the agent text as it is".
 *   - The tick is a true or false field `agree` in the own translation record.
 *   - The own text of a ticked row stays empty (round 59 answer 5, l223).
 *
 * Rules for this file:
 *   - Add the field only if it is missing.
 *   - If own_translations does not exist, print a line and change nothing.
 *   - The rules of the collection do not change: records never change after the create.
 *   - Safe to run twice.
 *
 * Down function (soft, like the other v2 migrations): keep the field and all data.
 */

migrate((app) => {
    let col;
    try {
        col = app.findCollectionByNameOrId("own_translations");
    } catch (_) {
        console.log("v2 migration: collection own_translations is missing, left as it is");
        return;
    }
    if (col.fields.getByName("agree")) {
        console.log("v2 migration: field agree exists, left as it is");
        return;
    }
    col.fields.add(new BoolField({ name: "agree" }));
    app.save(col);
}, (app) => {
    console.log("v2 migration down: the field agree and its data are kept");
});
