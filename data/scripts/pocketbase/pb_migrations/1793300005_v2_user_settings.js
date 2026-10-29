/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 user_settings: the theme and the pane settings of each user.
 *
 * Reason (round 58 answers 5 and 6, Q-A 2026-10-28 l203-204, and round 59 answer 6, l224):
 *   - "Every pane should have a setting cog button for customization": font, size, colors, width.
 *   - "Whole app, per account": the theme (light or high-contrast dark) stays in the account.
 *   - Kept in your account (round 59 answer 6): one record for each user.
 *
 * Collection user_settings (VISION-viewer 15.16.6):
 *   - user: relation to users, required, one value, cascadeDelete false.
 *   - theme: select with the values light and dark.
 *   - panes: JSON, at most 20000 bytes. The key v is the format number.
 *   - created and updated: explicit autodate fields, like migration 1793300001.
 *   - Index: one record for each user (unique index on user).
 *
 * Rules: a user reads and changes the own record only. The create rule has no role limit,
 * because a reader has the same screen and keeps a theme too. Nobody deletes a record
 * (the delete rule is null, so only a superuser can).
 *
 * Rules for this file:
 *   - Create the collection only if it does not exist.
 *   - If it exists, print a line and change nothing.
 *   - Safe to run twice.
 *
 * Down function: delete the collection only if it holds 0 records.
 * A collection with records stays, and the down function prints a line.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const OWN_ONLY = '@request.auth.id != "" && user = @request.auth.id';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, "user_settings")) {
        console.log("v2 migration: collection user_settings exists, left as it is");
        return;
    }
    const usersId = app.findCollectionByNameOrId("users").id;
    app.save(
        new Collection({
            type: "base",
            name: "user_settings",
            listRule: OWN_ONLY,
            viewRule: OWN_ONLY,
            createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
            updateRule: 'user = @request.auth.id && @request.body.user:changed = false',
            deleteRule: null,
            fields: [
                { name: "user", type: "relation", required: true, collectionId: usersId, maxSelect: 1, cascadeDelete: false },
                { name: "theme", type: "select", values: ["light", "dark"], maxSelect: 1 },
                { name: "panes", type: "json", maxSize: 20000 },
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_user_settings_user ON user_settings (user)"],
        }),
    );
}, (app) => {
    if (!collectionExists(app, "user_settings")) {
        return;
    }
    if (app.countRecords("user_settings") > 0) {
        console.log("v2 migration down: collection user_settings has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId("user_settings"));
});
