# Wikisource "Help:Page status": lossless summary

- Title: "Help:Page status" (MediaWiki page title). The process header gives the short title "Page status" and the note "An explanation of the different page statuses used by Wikisource."
- Publisher or author: English Wikisource contributors. First revision by ThomasV. Latest revision by ShakespeareFan00.
- Identifier and version: page ID 143878, namespace 12 (Help). Latest revision ID 15008304 (parent 15007770). First revision ID 529876 (parent 0). The rendered page reads "Retrieved from "https://en.wikisource.org/w/index.php?title=Help:Page_status&oldid=15008304"".
- Date: first revision 2008-01-10T13:17:15Z. Latest revision 2025-04-14T09:01:28Z (MediaWiki API). The footer reads "This page was last edited on 14 April 2025, at 09:01."
- Venue: English Wikisource (en.wikisource.org), a Wikimedia project. The page belongs to the "Proofreading" help navbox and to "Category:Help".
- Licence or terms: footer, verbatim: "Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply. By using this site, you agree to the Terms of Use and Privacy Policy." The licence link targets `creativecommons.org/licenses/by-sa/4.0/` (CC BY-SA 4.0).
- URL fetched:
  - https://en.wikisource.org/w/index.php?title=Help:Page_status&action=raw (HTTP 200, 3,940 bytes, wikitext).
  - https://en.wikisource.org/w/api.php?action=query&prop=revisions&titles=Help:Page_status&rvprop=ids|timestamp|user&format=json (HTTP 200, 283 bytes, latest revision).
  - https://en.wikisource.org/w/api.php?action=query&prop=revisions&titles=Help:Page_status&rvprop=ids|timestamp|user&rvdir=newer&rvlimit=1&format=json (HTTP 200, 312 bytes, first revision).
  - https://en.wikisource.org/wiki/Help:Page_status (HTTP 200, 107,742 bytes, rendered page with footer, template output, and status colors).
- Date fetched: 2026-10-07, 14:12 to 14:15 local time.
- Word count: this file, 146 lines and 1,703 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:21). Source text file `wikisource-help-page-status.full.txt`: 218 lines and 923 words, with site navigation and the language list included (`wc -lw`, run by aki-execute on 2026-10-07 at 14:13). Wikitext file `wikisource-help-page-status.wikitext`: 69 lines and 557 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:20).
- Domain note: Wikisource transcribes scanned books page by page in the "Page:" namespace. ProofreadPage is the MediaWiki extension that holds the page status.
- Source of this summary: full copy. Wikitext: `<V2>/docs/research/sources/wikisource-help-page-status.wikitext`. Rendered page: `<V2>/docs/research/sources/wikisource-help-page-status.full.html`, converted with `textutil` to `<V2>/docs/research/sources/wikisource-help-page-status.full.txt`. Revisions: `<V2>/docs/research/sources/wikisource-help-page-status.revisions.json` and `<V2>/docs/research/sources/wikisource-help-page-status.first-revision.json`. `<V2>` is `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer`. Status colors come from the inline TemplateStyles CSS in the rendered HTML.
- Code and data: the page names the ProofreadPage extension and the templates `{{Page status text}}` and `{{proofread status workflow}}`. It names no code repository.
- Version note: this summary follows revision 15008304. The wikitext writes "Not proofread". The rendered template output writes "Not Proofread". This summary uses the rendered form in quotes from the rendered page.

## 1. Lead

Verbatim:

> Pages in the "Page:" namespace at Wikisource each have an associated "status", which refers to how thoroughly the text on that page has been proofread.

Rule on who can see and who can change the status, verbatim:

> Page status is visible to all users, though can only be changed by users logged into their Wikimedia user account. As such, IP editors cannot change page status.

The page has 37 other language versions (interlanguage list on the rendered page).

## 2. Validation path

Verbatim:

> The validation path of the ProofreadPage extension involves five states:

The template `{{proofread status workflow}}` renders a three-row diagram. Cell by cell, from the rendered HTML:

- Row 1, spanning the first two columns: "↗ Without text".
- Row 2: "empty page" (italic, red text) → "Not Proofread" → "Proofread" → "Validated".
- Row 3, spanning the second and third columns: "↘ Problematic ↗".

[aki-execute note, agent inference] The layout reads as two paths. An empty page goes up to "Without text". A "Not Proofread" page can go down to "Problematic" and then up to "Proofread". The page text does not state these two paths in words.

## 3. Details

Verbatim: "The first three are the normal pathway:"

> - Not Proofread is the default value. If you've worked on a page, but don't have time to finish, this is the status to use. (See all pages.)
> - Proofread means proofread by one contributor. You have brought the page to the best condition you can where the text matches the scan, basic formatting is done, and you are reasonably happy with it. A Proofread page is ready for display to the casual reader—even if it has little errors in it. (See all pages.)
> - Validated means proofread by two contributors. The corresponding button is available only if the page has been already proofread by someone else: you cannot both proofread and validate the same page. (See all pages.)

Verbatim: "In addition,"

> - Without text is for blank pages. It is not used on pages with published content, such as images. (See all pages.)
> - Problematic indicates a problem that needs further work or discussion among contributors, such as a table, missing image, or a different alphabet. (See all pages.)

Each "(See all pages.)" links to the matching category: `Category:Not proofread`, `Category:Proofread`, `Category:Validated`, `Category:Without text`, `Category:Problematic`.

Image 1: `File:English Wikisource Index example.png` (thumbnail, 400px, right). Caption, verbatim:

> This color coding scheme is also visible in the page index view, where each page is listed with the appropriate background color.

### 3.1 Status buttons

Verbatim:

> You will find the buttons that indicate these states under the edit window. If a previous contributor has proofread the page already, they will appear as below:

Image 2: `File:Wikisource page proofread buttons.png`, alt text "Five buttons" (200px).

Verbatim:

> If no one has proofread the page yet, the buttons will appear as follows:

Image 3: `File:Wikisource page not proofread buttons.png`, alt text "Four buttons" (160px).

Verbatim:

> In both cases, you can change the status of the page by selecting the appropriate button and saving the page. If the green "Validate" button is not available to you, it will appear for other users if you select the yellow "Proofread" button and save.
>
> The state of each page in a document is shown on the index page, as shown in the screenshot on the right.

## 4. CSS

Verbatim:

> The template {{Page status text}} can be used to apply the status formatting.

Template calls and their rendered labels, verbatim:

- `{{page status text|without text}}`: Without text
- `{{page status text|not proofread}}`: Not Proofread
- `{{page status text|problematic}}`: Problematic
- `{{page status text|proofread}}`: Proofread
- `{{page status text|validated}}`: Validated

Verbatim:

> The above status colours can be also be used in CSS with the following class names (to set the background-color property):

- `class="quality0"`
- `class="quality1"`
- `class="quality2"`
- `class="quality3"`
- `class="quality4"`

## 5. Full status scheme

This table joins the page text with the CSS in the rendered HTML (`.mw-parser-output .qualityN{background-color:...}`). The hex values are verbatim from the CSS. The color words "green" and "yellow" are verbatim from the page. The other color words are [aki-execute note] descriptions of the hex values.

| Status (rendered) | CSS class | Light background | Night or dark background | Meaning (page text) | Who can set it (page text) |
|---|---|---|---|---|---|
| Without text | `quality0` | `#ddd` (grey) | `#55585e` | "for blank pages. It is not used on pages with published content, such as images." | Any logged-in user. IP editors cannot. |
| Not Proofread | `quality1` | `#ffa0a0` (light red) | `#971602` | "the default value. If you've worked on a page, but don't have time to finish, this is the status to use." | Any logged-in user. IP editors cannot. |
| Problematic | `quality2` | `#b0b0ff` (light blue) | `#40408c` | "a problem that needs further work or discussion among contributors, such as a table, missing image, or a different alphabet." | Any logged-in user. IP editors cannot. |
| Proofread | `quality3` | `#ffe867` (yellow, "the yellow "Proofread" button") | `#666600` | "proofread by one contributor" where "the text matches the scan, basic formatting is done". "ready for display to the casual reader—even if it has little errors in it." | Any logged-in user. IP editors cannot. |
| Validated | `quality4` | `#90ff90` (green, "the green "Validate" button") | `#00662e` | "proofread by two contributors" | A logged-in user other than the one who set "Proofread": "you cannot both proofread and validate the same page." The button is "available only if the page has been already proofread by someone else". |

Rules on validation, collected verbatim:

- "Page status is visible to all users, though can only be changed by users logged into their Wikimedia user account."
- "As such, IP editors cannot change page status."
- "The corresponding button is available only if the page has been already proofread by someone else: you cannot both proofread and validate the same page."
- "If the green "Validate" button is not available to you, it will appear for other users if you select the yellow "Proofread" button and save."

## 6. Navbox "Proofreading" (vte)

Rendered list, verbatim:

- Summaries: Beginner's guide to proofreading, Editing summary, Proofreading summary.
- Basic help: Formatting conventions, Index pages, Page scans, Page status, Transclusion, Layout.
- Specialised help: Block and inline elements, Footnotes and endnotes, Match and split, Mathematics, fractions and functions, Page breaks, Page numbers, Poetry, Sidenotes, Tables, Typography templates, Manuscripts.
- Reference: Style guide, ProofreadPage extension, Proofreading example.
- Collaboration: Monthly Challenge, Proofread of the Month, Works to be proofread, WikiProject Proofreading.

## Notes for the Viewer [aki-execute note, agent inference]

- Public status for reports: a status that "is visible to all users" but that only logged-in users can change is a model for a public status per page.
- Public status and change log: five named states with fixed colors ("Without text", "Not Proofread", "Problematic", "Proofread", "Validated") give a small vocabulary for a per-page check status.
- "Report a problem" path: "Problematic" marks "a problem that needs further work or discussion among contributors", which is a named state for a page with an open report.
- AI label per page: the status sits on each page, and the index view shows "each page is listed with the appropriate background color", which is one pattern for a per-page label that also rolls up to the work.
- Raw images as a component: "Proofread" means "the text matches the scan", which assumes that the scan sits next to the text for checking.
- Change log: "you cannot both proofread and validate the same page" is a two-person rule that a log can record as two separate entries.
