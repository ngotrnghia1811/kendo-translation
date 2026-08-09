/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collectionNames = [
        "articles", "videos", "terminology", "segments",
        "bookmarks", "reading_progress", "document_assignments",
        "document_decisions", "document_sections", "document_settings",
        "edit_patterns", "qa_issue_patterns", "qa_issues",
        "qa_issue_pattern_events", "segment_comments",
        "segment_phase_transitions", "segment_revisions",
        "segment_suggestions", "style_guide", "user_history",
        "video_notes", "agent_logs", "agent_prompts", "books",
    ];

    for (const name of collectionNames) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const idField = collection.fields.find(f => f.name === "id");
            if (idField) {
                idField.min = 1;
                idField.max = 50;
                // Allow UUIDs: hyphens, lowercase alphanumeric
                idField.pattern = "^[a-z0-9-]+$";
                app.save(collection);
            }
        } catch (e) {
            // Collection might not exist yet
        }
    }

    // Also fix the users auth collection
    const users = app.findCollectionByNameOrId("users");
    const usersIdField = users.fields.find(f => f.name === "id");
    if (usersIdField) {
        usersIdField.min = 1;
        usersIdField.max = 50;
        usersIdField.pattern = "^[a-z0-9-]+$";
        app.save(users);
    }
}, (app) => {
    const collectionNames = [
        "articles", "videos", "terminology", "segments",
        "bookmarks", "reading_progress", "document_assignments",
        "document_decisions", "document_sections", "document_settings",
        "edit_patterns", "qa_issue_patterns", "qa_issues",
        "qa_issue_pattern_events", "segment_comments",
        "segment_phase_transitions", "segment_revisions",
        "segment_suggestions", "style_guide", "user_history",
        "video_notes", "agent_logs", "agent_prompts", "books",
    ];

    for (const name of collectionNames) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const idField = collection.fields.find(f => f.name === "id");
            if (idField) {
                idField.min = 15;
                idField.max = 15;
                idField.pattern = "^[a-z0-9]+$";
                app.save(collection);
            }
        } catch (e) {}
    }

    const users = app.findCollectionByNameOrId("users");
    const usersIdField = users.fields.find(f => f.name === "id");
    if (usersIdField) {
        usersIdField.min = 15;
        usersIdField.max = 15;
        usersIdField.pattern = "^[a-z0-9]+$";
        app.save(users);
    }
});
