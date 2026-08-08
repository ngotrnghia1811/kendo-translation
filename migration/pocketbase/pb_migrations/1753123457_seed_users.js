/// <reference path="../pb_data/types.d.ts" />

/**
 * Seed users migration — creates 7 user accounts with temporary passwords.
 *
 * IMPORTANT: PocketBase uses PBKDF2-based hashing, NOT bcrypt (Supabase/GoTrue).
 * Existing Supabase password hashes CANNOT be reused.
 * All users MUST perform a password reset on first login.
 *
 * The admin user is created first; subsequent users are seeded from
 * the profiles table data in the pg_dump backup.
 *
 * Profile data (username, role) is merged into the users auth collection's
 * custom fields rather than being a separate collection.
 */

migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    // ── Admin user ───────────────────────────────────────────────
    let admin = new Record(users);
    admin.set("email", "admin@kendo-translation.local");
    admin.set("password", "TempAdmin2026!");
    admin.set("passwordConfirm", "TempAdmin2026!");
    admin.set("role", "admin");
    admin.set("verified", true);
    admin.set("username", "admin");
    admin.set("display_name", "Administrator");
    app.save(admin);

    // ── Additional users — seed from profiles table data ──────────
    // NOTE: These are placeholder credentials. After migration,
    // trigger password-reset emails for each user.
    // The actual email addresses and profile data should come from
    // the import script (see scripts/import_data.js) which reads
    // the real auth.users + profiles rows from the pg_dump.
    //
    // This migration file seeds ONE admin so the system is bootable.
    // Remaining users (translators, readers, qa) are created by the
    // data import script using the PocketBase JS SDK, which allows
    // setting custom IDs to match the Supabase UUIDs.

}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    const adminUser = app.findAuthRecordByEmail("users", "admin@kendo-translation.local");
    if (adminUser) {
        app.delete(adminUser);
    }
});
