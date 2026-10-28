/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 users: roles, disabled flag and API rules.
 *
 * Runs on two shapes:
 *   - a fresh PocketBase (default `users` collection, no `role` field)
 *   - the live server (v1 `users` with a `role` select that holds "qa")
 *
 * Rules:
 *   - Keep an existing `role` field as it is. The live value "qa" stays.
 *   - Add `role` and `disabled` only if they are missing.
 *   - Replace the five API rules and `authRule` with the v2 strings.
 *
 * Down function:
 *   - Set `authRule` to "" so that sign-in does not depend on `disabled`.
 *   - Keep the fields and the API rules.
 *   - Reason: a drop of `disabled` loses data, and the v1 rules let any
 *     signed-in user change any role. Do not bring that hole back.
 */

migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    if (!users.fields.getByName("role")) {
        users.fields.add(
            new SelectField({
                name: "role",
                required: true,
                values: ["admin", "translator", "reader"],
                maxSelect: 1,
            })
        );
    }

    if (!users.fields.getByName("disabled")) {
        users.fields.add(new BoolField({ name: "disabled" }));
    }

    // null = only a superuser can do the action.
    users.listRule = '@request.auth.id != ""';
    users.viewRule = '@request.auth.id != ""';
    users.createRule = null;
    users.updateRule =
        '(id = @request.auth.id && @request.body.role:isset = false && @request.body.disabled:isset = false) || @request.auth.role = "admin"';
    users.deleteRule = '@request.auth.role = "admin"';
    // A disabled account cannot sign in.
    users.authRule = "disabled = false";

    app.save(users);
}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.authRule = "";
    app.save(users);
});
