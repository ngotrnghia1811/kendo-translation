/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 users: the field `approved` and the sign-up rule (unit RC1, round 63 answer 4, Q-A 2026-10-28 l308).
 *
 * Owner words: "Reader role, not approved (Recommended), Field approved (Recommended), /translate sends reader to /read (Recommended)".
 * Older rule (2026-10-07 l96): an admin must validate a reader sign-up before the person can view the text.
 *
 * What this file does:
 *   - Add the bool field `approved` to `users` if it is missing.
 *   - When the field is new, set `approved` true on every existing user, so that no one is locked out.
 *     When the field exists already, the file does not touch the data. So a second run never approves a new sign-up.
 *   - createRule: a public sign-up can create a user with role "reader" only. The body must not set `disabled`.
 *     The body must not set `approved` to true (it may leave the key out or send false). The field default is false.
 *   - updateRule: the first branch (a user changes the own record) now also forbids the key `approved`.
 *     So a reader cannot approve the own account. An admin can change any record.
 *   - listRule and viewRule: a reader sees the own record only. A translator and an admin see all records.
 *     Reason: with a public sign-up, a stranger would list the name, the role, and (when visible) the email of every account.
 *     The comment view reads the user name of a comment through expand, and only translators and admins read comments, so they keep the access.
 *     The sign-up route sets emailVisibility true, so that an admin sees the email of a new reader on the approval page.
 *   - deleteRule and authRule stay as migration 1793300000 set them.
 *
 * Down function: set createRule back to null (only a superuser creates users). Keep the field, the data, the stricter updateRule, and the stricter list and view rules.
 */

const CREATE_RULE =
    '@request.body.role = "reader" && @request.body.disabled:isset = false && (@request.body.approved:isset = false || @request.body.approved = false)';
const SEE_RULE = '@request.auth.id != "" && (id = @request.auth.id || @request.auth.role = "admin" || @request.auth.role = "translator")';
const UPDATE_RULE =
    '(id = @request.auth.id && @request.body.role:isset = false && @request.body.disabled:isset = false && @request.body.approved:isset = false) || @request.auth.role = "admin"';

migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    let added = false;
    if (!users.fields.getByName("approved")) {
        users.fields.add(new BoolField({ name: "approved" }));
        added = true;
    }
    users.createRule = CREATE_RULE;
    users.updateRule = UPDATE_RULE;
    users.listRule = SEE_RULE;
    users.viewRule = SEE_RULE;
    app.save(users);

    if (added) {
        const records = app.findAllRecords("users");
        for (const rec of records) {
            rec.set("approved", true);
            app.saveNoValidate(rec);
        }
        console.log("v2 migration: field approved added, " + records.length + " existing user(s) set to approved");
    } else {
        console.log("v2 migration: field approved exists, data left as it is");
    }
}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);
});
