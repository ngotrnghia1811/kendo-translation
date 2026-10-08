# Sefaria Help Center, translation and view articles: lossless summary

- Title: three articles.
  - Article A: "How to Choose Between Bilingual or Monolingual Views".
  - Article B: "How to Select a Translation Other Than Your Default Translation".
  - Article C (supplementary): "How to Select Your Bilingual Text Layout". The survey names this article as Not verified (search extract only) and cites no URL for it. Article A and Article C link to each other.
- Publisher or author: Sefaria (Sefaria Help Center). The Zendesk API gives `author_id` 12591109034652 for Articles A and B. The API does not give an author name.
- Identifier and version: Zendesk Help Center article IDs.
  - Article A: 18613903906716, `section_id` 12756520483868.
  - Article B: 18613593620636, `section_id` 18613320256156, `label_names` "Study Tools", "Resource Panel", "Text", "customize view".
  - Article C: 18612240702620, `section_id` 12756520483868.
  - The API gives no revision number.
- Date (Zendesk API fields, UTC):
  - Article A: `created_at` 2025-02-20T21:58:06Z, `edited_at` 2026-02-16T08:17:48Z, `updated_at` 2026-02-16T08:17:49Z.
  - Article B: `created_at` 2025-02-20T21:19:18Z, `edited_at` 2026-10-01T15:21:26Z, `updated_at` 2026-10-07T05:37:15Z.
  - Article C: `created_at` 2025-02-20T19:18:45Z, `edited_at` 2026-02-16T08:39:55Z, `updated_at` 2026-02-16T08:39:55Z.
  - [aki-execute note] The earlier excerpt shows "Updated October 01, 2026 15:21" for Article B, which matches `edited_at`. The later `updated_at` value has no visible body change in this fetch. Not verified.
- Venue: Sefaria Help Center (help.sefaria.org, hosted on Zendesk, API base `sefariahelp.zendesk.com`).
- Licence or terms: the API bodies state no licence or terms. Not verified.
- URL fetched:
  - https://help.sefaria.org/api/v2/help_center/en-us/articles/18613903906716.json (HTTP 200, 2,475 bytes).
  - https://help.sefaria.org/api/v2/help_center/en-us/articles/18613593620636.json (HTTP 200, 4,267 bytes).
  - https://help.sefaria.org/api/v2/help_center/en-us/articles/18612240702620.json (HTTP 200, 2,752 bytes). aki-execute found this ID with https://help.sefaria.org/api/v2/help_center/articles/search.json?query=bilingual%20text%20layout (HTTP 200, not saved in the repo).
  - The rendered pages https://help.sefaria.org/hc/en-us/articles/18613903906716-How-to-Choose-Between-Bilingual-or-Monolingual-Views and https://help.sefaria.org/hc/en-us/articles/18613593620636-How-to-Select-a-Translation-and-View-Translation-Options returned HTTP 403 with the default curl user agent. One retry each with a desktop Chrome user agent string also returned HTTP 403.
- Date fetched: 2026-10-07, 14:12 to 14:15 local time.
- Word count: this file, 148 lines and 1,467 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:21). Source text files (`wc -lw`, run by aki-execute on 2026-10-07 at 14:15): `sefaria-help-18613903906716.full.txt` 14 lines and 121 words, `sefaria-help-18613593620636.full.txt` 24 lines and 247 words, `sefaria-help-18612240702620.full.txt` 17 lines and 137 words.
- Domain note: help pages for the Sefaria Library, a library of Jewish texts in the original language (Hebrew and Aramaic, menu label "א") with translations.
- Source of this summary: full article bodies from the Zendesk API, saved as `<V2>/docs/research/sources/sefaria-help-<id>.json`. aki-execute wrapped each `title` and `body` field in an HTML shell and converted it with `textutil -convert txt` to `<V2>/docs/research/sources/sefaria-help-<id>.full.txt`. `<V2>` is `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer`. The rendered page chrome (navigation, related-article list, footer) is not in this copy because of the HTTP 403.
- Code and data: none named.
- Version note: the canonical `html_url` of Article B is https://help.sefaria.org/hc/en-us/articles/18613593620636-How-to-Select-a-Translation-Other-Than-Your-Default-Translation. The survey and `references.bib` use the slug `-How-to-Select-a-Translation-and-View-Translation-Options`. The article ID is the same.

## 1. Article A: How to Choose Between Bilingual or Monolingual Views

Article ID 18613903906716. Edited 2026-02-16.

Opening, verbatim:

> On Sefaria, you can choose between three language viewing options by accessing the A/א Menu:
> - Source
> - Translation
> - Source with Translation

Link: ">>> Learn more about the A/א Menu" (https://help.sefaria.org/hc/en-us/articles/18472614956956). The search API lists this target as "Quick Guide: Meet the Sefaria Library A/א Menu".

Procedure "To choose your preferred language viewing option:", verbatim:

> 1. When a text is open, **click** **on the A or א menu,** found at the top right corner of the screen.
> 2. **Click** on your preferred view:
>    - Source
>    - Translation
>    - Source with Translation

Note (italic on the page), verbatim:

> Please note: A translation is only visible if a translation exists in the Library. If the language is set to bilingual but only one language appears, this indicates that Sefaria does not yet have a translation for the text.

The article has no image.

## 2. Article B: How to Select a Translation Other Than Your Default Translation

Article ID 18613593620636. Edited 2026-10-01.

Opening, verbatim:

> Many texts in the Sefaria Library are available in multiple translations and editions. These can be changed at any time by accessing the Sefaria Library Resource Panel.

Link: ">>> Learn more about the Sefaria Library Resource Panel" (https://help.sefaria.org/hc/en-us/articles/18472472138652).

### 2.1 To change translations on the in-browser interface

Steps, verbatim:

> 1. **Click on any passage of text** to open the Resource Panel.
> 2. **Scroll down to locate the subheading Translations** in the Resource Panel.
> 3. **Click on Translations** to view the available options.
> 4. **Scroll the available options** to find your preferred translation.
> 5. **Click on Select**, below the title of the translation, to confirm your choice.

Image: an animated GIF, centered, alt text "02;18 - Choose a Translation.gif" (https://help.sefaria.org/hc/article_attachments/20629714793756). This unit did not fetch the image.

### 2.2 To open two translations in adjacent panels

Steps, verbatim:

> 1. **Click on any passage of text** to open the Resource Panel.
> 2. **Scroll down to locate the Translations subheading** in the Resource Panel.
> 3. **Click on Translations** to view the available options.
> 4. **Scroll the available options** to find your preferred translation.
> 5. **Click on the preview text** to open a new panel showing the preview text along with two buttons: Open and Add to Sheet.
> 6. **Click on Open** to see your chosen translation in an adjacent panel.

### 2.3 Notes

Notes (italic on the page), verbatim:

> Please note:
> - Choosing a Torah translation for one book designates the translation for all Five Books of Moses.
> - Choosing a translation on the Sefaria Library mobile app requires a separate process.

Link: "Learn how to select a translation in the Sefaria Library mobile app >>>" (https://help.sefaria.org/hc/en-us/articles/20234331425820). This unit did not fetch the linked article.

API flag: `comments_disabled` is true for Article B and false for Article A. [aki-execute note] The rendered pages were not available, so the visible effect of this flag is Not verified.

## 3. Article C (supplementary): How to Select Your Bilingual Text Layout

Article ID 18612240702620. Edited 2026-02-16. [aki-execute note] The survey lists the three layout names as "search extract only". This full body confirms them.

Opening, verbatim:

> On Sefaria, you can choose between three language viewing options:
> - Source
> - Translation
> - Source with Translation

Link: ">>> Learn how to choose your preferred language view" (https://help.sefaria.org/hc/en-us/articles/18613903906716, that is Article A).

Layout formats, verbatim:

> When viewing a source in its original language alongside a translation, you can choose between three viewing formats:
> - Original language on the right
> - Original language on the left
> - Stacked one on top of the other

Image: alt text "02;21;05 (Translation) - Text Layout Options.png" (https://help.sefaria.org/hc/article_attachments/22445563433372). This unit did not fetch the image.

Procedure "To choose your preferred bilingual viewing option:", verbatim:

> 1. When a text is open, **click** **on the A or א menu,** found at the top right corner of the screen.
> 2. **Click on Source with Translation** to ensure you’re viewing the text in bilingual mode.
> 3. Next to the Layout subheading, **click** **on one of the three icons** to indicate your layout preference.

## 4. Other Help Center titles seen in the search result

The search call for "bilingual text layout" also returned these titles. This unit did not fetch them. They are listed only to record what exists.

- 21165654174108 "How to Change Your Preferred Translation"
- 18613683642652 "How to Edit a Community Translation"
- 20528663772572 "What is Sefaria for Google Docs?"
- 20528048894620 "How to Add a Source From the Sefaria Library to a Google Doc"

## Notes for the Viewer [aki-execute note, agent inference]

- All types of viewing: Sefaria offers three views from one menu ("Source", "Translation", "Source with Translation"), which maps to the single-language and bilingual views.
- Movable panels: Sefaria lays out bilingual text as "Original language on the right", "Original language on the left", or "Stacked one on top of the other", which is a minimal set of positions for a source panel.
- Original-language versions as reader components: "Source with Translation" keeps the original next to the translation as a reader choice, not a fixed layout.
- Movable panels with text in different languages: "Click on Open to see your chosen translation in an adjacent panel" shows a second translation as its own panel next to the first.
- Bilingual view when one language is absent: "A translation is only visible if a translation exists in the Library" is plain wording for a language that is not ready yet.
- Reader-chosen components: the choice persists at a scope wider than one text ("Choosing a Torah translation for one book designates the translation for all Five Books of Moses"), which is one model for a work-level or collection-level reader setting.
