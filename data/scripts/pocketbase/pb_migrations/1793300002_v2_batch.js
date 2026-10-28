/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 batch API: turn on `POST /api/batch`.
 *
 * Reason (unit H1, round 54 answer 7, Q-A 2026-10-28 l126): one Save of the human-translation-view
 * writes one `own_translations` record for every row of the page, all with the same version number.
 * The batch API runs all requests of one call in one transaction: all records are saved, or none.
 * PocketBase 0.39.10 has the batch API off by default (status 403 "Batch requests are not allowed.").
 * The collection rules still apply to every request of a batch.
 *
 * Settings after this migration:
 *   - enabled     true
 *   - maxRequests at least 200 (default 50). A page can hold more than 50 sentence groups.
 *   - timeout     at least 10 seconds (default 3)
 * A higher value that exists already stays as it is.
 *
 * Down function (soft, like the other v2 migrations): turn the batch API off.
 * It keeps `maxRequests` and `timeout`. No data is dropped.
 */

migrate((app) => {
    const settings = app.settings();
    settings.batch.enabled = true;
    if (settings.batch.maxRequests < 200) {
        settings.batch.maxRequests = 200;
    }
    if (settings.batch.timeout < 10) {
        settings.batch.timeout = 10;
    }
    app.save(settings);
}, (app) => {
    const settings = app.settings();
    settings.batch.enabled = false;
    app.save(settings);
});
