# SuttaCentral "Interface Translation Wiki": lossless summary

- Title: "Interface Translation Wiki" (topic title in the Discourse JSON). HTML `<title>`: "Interface Translation Wiki - dev - Discuss & Discover".
- Publisher or author: SuttaCentral forum "Discuss & Discover". Topic created by Snowbird. Other posters: sabbamitta (display name "Sabbamitta Silashin"), Brahmali, HongDa (display name "Hongda").
- Identifier and version: Discourse topic ID 31199, category ID 20 (category "dev" per the HTML title). Post 1 is a wiki post (`"wiki": true`) at version 6. All other posts are not wiki posts. Posts 3 and 6 are at version 2. The others are at version 1.
- Date (Discourse JSON, UTC): topic `created_at` 2023-11-10T19:46:15.537Z. Post 1 created 2023-11-10T19:46:15.777Z, `last_wiki_edit` 2024-03-21T20:24:43.176Z. Topic `last_posted_at` 2023-12-29T07:39:53.424Z. Post 17 (a moderator action note) created 2025-05-23T14:50:34.672Z.
- Venue: SuttaCentral "Discuss & Discover" Discourse forum (discourse.suttacentral.net).
- Licence or terms: the topic states no licence. The forum footer links to "Terms of Service" (`/tos`) and "Privacy Policy". This unit did not fetch those pages. Not verified.
- URL fetched:
  - https://discourse.suttacentral.net/t/31199.json (HTTP 200, 90,029 bytes).
  - https://discourse.suttacentral.net/raw/31199 (HTTP 200, 13,650 bytes).
  - https://discourse.suttacentral.net/t/interface-translation-wiki/31199 (HTTP 200, 86,016 bytes, rendered page for title and footer).
- Date fetched: 2026-10-07, 14:12 to 14:15 local time.
- Word count: this file, 355 lines and 2,710 words (`wc -lw`, run by aki-execute on 2026-10-07 at 14:21). Source text files (`wc -lw`, run by aki-execute on 2026-10-07 at 14:20): `suttacentral-interface-wiki-31199-raw.full.txt` (raw markdown of all posts) 361 lines and 1,795 words, `suttacentral-interface-wiki-31199.full.txt` (rendered page) 260 lines and 1,825 words. Topic statistics in the JSON: `posts_count` 16, 17 posts in the stream, `reply_count` 14, `views` 614, `like_count` 29, `word_count` 1884.
- Domain note: SuttaCentral is a website of early Buddhist texts. The root texts are mostly Pali, shown with translations. This wiki explains English interface strings (keys) to volunteers who translate the site interface into other languages.
- Source of this summary: full copy. Main text: `<V2>/docs/research/sources/suttacentral-interface-wiki-31199-raw.full.txt` (Discourse raw markdown). Dates, wiki flag, and versions: `<V2>/docs/research/sources/suttacentral-interface-wiki-31199.json`. Rendered page: `<V2>/docs/research/sources/suttacentral-interface-wiki-31199.full.html`, converted with `textutil` to `<V2>/docs/research/sources/suttacentral-interface-wiki-31199.full.txt`. `<V2>` is `/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-viewer`.
- Code and data: post 1 links the complete English interface file at https://github.com/suttacentral/bilara-data/blob/published/root/en/site/interface_root-en-site.json. Post 4 links https://github.com/suttacentral/suttacentral/issues/2732 for obsolete text. This unit did not fetch either link.
- Version note: the survey quotes post 1 (badges, views, references, search) and post 10 (`text:viewImage`). This summary keeps all 17 posts, each in its own section. The raw markdown header of a post shows its last-edit time. The JSON gives the creation time.

## Post 1: the wiki (Snowbird)

Created 2023-11-10 19:46 UTC. Last wiki edit 2024-03-21 20:24 UTC. Wiki post, version 6.

Intro, verbatim:

> The following are explanations of text segments of the SuttaCentral website interface for people who are translating it into other languages. The complete English interface file can be found [here](https://github.com/suttacentral/bilara-data/blob/published/root/en/site/interface_root-en-site.json). If you would like to translate the interface into your language, please see [this thread](https://discourse.suttacentral.net/t/volunteer-translators-needed-for-sc-interface/29875).

The post has an automatic table of contents (`<div data-theme-toc="true">`).

### Pages

Verbatim:

> If you look at the first part of the keys, you will see that some are related to complete pages. For example:

- `donate`, verbatim: "These are all on the [donate now](https://suttacentral.net/donate-now?lang=en) page. This is different from the main [Donation page](https://suttacentral.net/donations?lang=en)"
- `offline`, verbatim: "This is the page for saving the site for use [offline](https://suttacentral.net/offline?lang=en)"

### Major Areas

Verbatim: "Some of the text is on specific parts of pages."

- `suttaplex`, verbatim: "[This](https://suttacentral.net/sn47.19?view=normal&lang=en) is an example of the `suttaplex` area:". Image: alt text "image" (690x480, shown at 50%).
- `dictionary`, verbatim:

  > Most of the dictionary items can be found in two places. One is in the `views` setting when viewing a sutta. You have to scroll left and right to see everything:

  Image: alt text "image" (690x266, 75%).

  > There is also dictionary text on a dictionary result page, e.g. [sīla](https://suttacentral.net/define/s%C4%ABla?lang=en)

  Image: alt text "image" (537x500).

### Individual items

Each heading below is the key and, where given, its English value. The explanation under it is verbatim.

#### badge:aligned, badge:annotated, badge:legacy

Image: alt text "image" (690x313, 75%).

> These three items are used to describe translations.
>
> "Aligned" means that the translations can be viewed side by side with the root text (e.g. Pali).
>
> "Legacy" means that the translations *cannot* be viewed with the root text. Many of these translations are older, therefore the word "legacy." However they aren't necessarily old.
>
> "Annotated" means that there are footnotes/end notes.

#### dictionary:adjacentTerms—Adjacent Terms

> This is the heading in dictionary results that lists words that come before or after the the word searched for. For example if someone searched for "samādhi" the adjacent terms might be "samādisati, samādhāna, samādhika, samādhiyati"

Image: alt text "2023-11-11 08_29_09-Definitions for_ samādhika — Mozilla Firefox" (690x330, 75%).

#### dictionary:changePaliScriptDescription—This enables you to read the Pali text in various scripts.

> "Various scripts" refers to the alphabets used to display the Pali. For example the Pali can be displayed using Roman letters (the default) or using Thai, Sinhala or Burmese alphabets.

#### dictionary:lineByLine—Line by line

> This is the option to display the suttas with one line in English, one line in Pali, one line in English, one line in Pali, etc. This is an example of text displayed "line by line":

Image: alt text "image" (690x295, 50%).

#### dictionary:plain—Plain

> This is the option to display only the translation without showing any Pali (compared to "Line by line"

[aki-execute note] The closing parenthesis is missing in the source.

#### dictionary:reference—References

> "Refrences" are the paragraph or page numbers that are in original Pali manuscripts. They allow someone to "refer" to a specific place in the Pali text. There are many different numbering systems and this text is the heading for chosing which ones to display.

Image: alt text "2023-11-11 08_32_06-AN 10.2_ Cetanākaraṇīyasutta—Bhikkhu Sujato — Mozilla Firefox" (690x313, 75%).

#### dictionary:textViewEnabled—{textView}-view is now enabled on applicable texts.

> This is a popup message that displays when switching between "Plain", "Side by side" and "Line by line" The `{textView}` part will be replaced with the language the user has chosen.

Image: animated recording, alt text "Recording-2023-11-11-083835" (669x500, 50%).

[aki-execute note] The wiki has no separate entry for a "Side by side" key. The name "Side by side" appears only in this explanation and in the "Aligned" badge text.

#### dictionary:viewTextualInfo—View textual information

> (not sure what this is)

[aki-execute note] Post 9 states that this key is no longer used.

#### footer:licensing—Licensing

> This is the copyright. (Perhaps "licensing" is used because some of the texts are free from copyright.)

#### footer:readingfaithfully—Reading Faithfully—Devotional and contemplative sutta reading for the faithful disciple

> "ReadingFaithfully" is the name of a website and should not be translated.

#### footer:sourceCode—Source code on Github

> "Github" is a name and should not be translated.

#### interface:ab—Systematic Treatises

> This is just the English translation for the Pali word "Abhidhamma."

#### interface:anEssayTitle—The Numbered Discourses: things that are useful every day

> This referrs to the Anguttara Nikaya

#### interface:numbered—Numbered

> This referrs to the Anguttara Nikaya

#### suttaplex:blurb Blurb

> The "blurb" for a sutta is like a one line summary.

Image: alt text "2023-11-11 08_43_33-Cetanākaraṇīyasutta—Suttas and Parallels — Mozilla Firefox" (690x407, 50%).

#### text:viewImage—View page image

> (not sure what this is)

[aki-execute note] Post 10 explains this key.

#### autocomplete:filterSearch—Filter search to early Buddhist suttas

> This is on the search interface in the instant search. It adds the filter `in:ebs` to limit the search results to only early Buddhist suttas.

Image: alt text "image" (690x330, 50%).

#### dictionary:showHighlightingTitle—Show Highlighting

> This is found in the "view" settings when looking at a sutta. It is the only option under "Highlight text-critical details"

Two images: alt text "image" (690x147) and alt text "image" (397x302, 50%).

#### interface:viewCompactButtonText—spacing

> and "interface:viewComfyButtonText": "spacing"
>
> This is seen on a sutta chapter listing page, e.g. [Mūlapariyāyavagga](https://suttacentral.net/mn-mulapariyayavagga?view=normal&lang=en)
>
> It has two states but the icon label is always the same. Try the button on the page above to see the effect.

Image: alt text "image" (496x500, 50%).

#### publication:title—Publication details

> This is the title of the publication details section. You can find it by viewing any sutta and clicking on the "info" icon.

Image: alt text "image" (422x500, 50%).

#### search:inAllLanguage—in all languages

> This is a sentence fragment that explains a search result page when the search is for all languages (e.g. not restricted to English only)

Image: alt text "image" (690x293, 50%).

#### `bottomsheet` etc

> All of the `bottomsheet` items are part of the Pali word lookup:

Image: alt text "bottom sheet example" (690x238).

## Post 2 (Snowbird, 2023-11-10 19:48 UTC)

Verbatim:

> I wonder if Ven. @sabbamitta or @noeismet knows what
>
> * dictionary:viewTextualInfo View textual information
> * text:viewImage View page image
>
> are?

## Post 3 (sabbamitta, created 2023-11-10 20:07 UTC, edited 20:13 UTC, reply to post 2)

Quotes post 2. Verbatim:

> Sorry, I can't help. I've been searching around without success (but have seen a few more things I had already forgotten …) :smiley:
>
> Maybe these are things that aren't active any more.

## Post 4 (Snowbird, 2023-11-10 20:20 UTC, reply to post 3)

Quotes "Maybe these are things that aren’t active any more." Verbatim:

> Could be. I'm collecting obsolete text here: https://github.com/suttacentral/suttacentral/issues/2732

## Post 5 (Snowbird, 2023-12-27 04:39 UTC)

Verbatim:

> @sabbamitta , do you know what
>
> > dictionary:relatedItems
>
> Is?

## Post 6 (sabbamitta, created 2023-12-27 07:02 UTC, edited 07:17 UTC, reply to post 5)

Image: alt text "Screenshot from 2023-12-27 07-57-07" (625x500). Verbatim:

> Hmm … I *thought* I know it, but the item seems to have been renamed?
>
> I thought it's what you now see as "adjacent terms"---which however I don't see anywhere in the "interface" file. The website does show a German translation though which is different from what is found under `dictionary:relatedItems` in the interface file. So "adjacent terms/benachbarte Begriffe" must be *somewhere* in *some* of the i18n files … :thinking:
>
> I can't find it anywhere. So it seems we have the strange situation that in the interface file we have (for German) the pair "related items/verwandte Begriffe", while on the website we have the pair "adjacent items/benachbarte Begriffe".
>
> @HongDa ?

## Post 7 (Snowbird, 2023-12-27 07:55 UTC, reply to post 6)

Verbatim:

> I expected to find it at the bottom of the dictionary page too.

## Post 8 (Brahmali, 2023-12-27 09:15 UTC, reply to post 6)

Quotes post 6 on "adjacent terms". Verbatim:

> It's there! So I think you are right, there has been a change, which means I don't need to worry about it. Right? Thanks, Venerables!

## Post 9 (HongDa, 2023-12-27 12:04 UTC)

Quotes post 2. Verbatim:

> * dictionary:viewTextualInfo View textual information
> * dictionary:relatedItems
>
> I searched the code and these two items are no longer used at the moment.

## Post 10 (HongDa, 2023-12-27 12:05 UTC)

Verbatim:

> * text:viewImage View page image
>
> This is still in use and is about the title of the image in the legacy text.

## Post 11 (Brahmali, 2023-12-28 00:29 UTC, reply to post 6)

Verbatim:

> Dear Ayya, thanks so much for your support! Are you able to help me some more? Here is another one I am unsure of:
>
> > dictionary:dictionaryResultsText
> > Pali dictionary results for
>
> First of all, what is the relationship between these two? Is it that the latter is specific and changeable, whereas the former is a stable and underlying label?
>
> Second, has the second one of these now been changed to:
>
> > SuttaCentral — Dictionary results

## Post 12 (Snowbird, 2023-12-28 02:53 UTC)

Verbatim:

> The first bit (usually with a colon) is the key. That is like the variable name in the code. It's really just the same concept as segment numbers. The key stays the same across all translations. They are only in English because that is the language of the coders.
>
> Does that answer your question?

## Post 13 (Brahmali, 2023-12-28 07:16 UTC, reply to post 12)

Verbatim:

> All good! (Hmmm … adding a few words for my post to be accepted! :roll_eyes:)

## Post 14 (sabbamitta, 2023-12-28 08:56 UTC, reply to post 11)

Quotes post 11 on "SuttaCentral — Dictionary results". Verbatim:

> Hmm … in the Bilara interface file there are these two key/value pairs:
>
> `"dictionary:dictionaryResultsText": "Pali dictionary results for"`
>
> and
>
> `"dictionaryResults": "SuttaCentral — Dictionary results"`
>
> However I can't find any of them on the website.
>
> May I ask what kind of work you are doing, and in which context you are seeing these things?
>
> I have a memory that in the search dialogue on SC there was the option to select seeing only results from the dictionaries. Perhaps this is what it referred to? But I can't find this option any more at the moment. Bhante @Snowbird should know if this has been disabled perhaps.

## Post 15 (Brahmali, 2023-12-29 01:44 UTC, reply to post 14)

Quotes post 14 three times. The post alternates quote blocks and replies. In order:

- Quote of post 14: "However I can’t find any of them on the website."
- Reply: "The second one"
- Quote of post 14: `"dictionaryResults": "SuttaCentral — Dictionary results"`
- Reply, verbatim:

  > is found at the top of the dictionary page. (When you click on a word in the text, you get a definition at the bottom. When you click on the word again, within the definition, you a get a whole dictionary page, which is headed by the phrase above.)

- Quote of post 14: "May I ask what kind of work you are doing, and in which context you are seeing these things?"
- Reply, verbatim:

  > I am helping to translate the interface into Norwegian. I only have a list of words/phrases, and I need to see their context on the website to be able to translate properly.
  >
  > Anyway, things are going quite well, and I suspect the phrase in question may no longer exist on the website.
  >
  > Thanks again for your support!

## Post 16 (sabbamitta, 2023-12-29 07:39 UTC, reply to post 15)

Quotes post 15 four times. Quote and verbatim reply pairs, in order:

- Quote: "is found at the top of the dictionary page." Reply: "Ah yes! How could I miss this! :smile:"
- Quote: "I am helping to translate the interface into Norwegian." Reply: "Wonderful! :dolphin:"
- Quote: "Anyway, things are going quite well, and I suspect the phrase in question may no longer exist on the website." Reply: "Quite possible. There are a number of such things hanging around."
- Quote: "Thanks again for your support!" Reply: "You are most welcome! :pray:"

## Post 17 (Snowbird, 2025-05-23 14:50 UTC)

Verbatim:

> 6 posts were split to a new topic: [Display notes on non-English Bilara translations](/t/display-notes-on-non-english-bilara-translations/39590)

[aki-execute note] This unit did not fetch topic 39590.

## Notes for the Viewer [aki-execute note, agent inference]

- All types of viewing: SuttaCentral names three text views, "Plain", "Side by side", and "Line by line", which map to translation only, bilingual columns, and bilingual interleaved lines.
- Bilingual pairing as a component: "Line by line" means "one line in English, one line in Pali", which is a pairing unit (line) that a reader can switch on or off.
- Original-language versions as reader components: the "Aligned" badge marks translations that "can be viewed side by side with the root text", and "Legacy" marks ones that "*cannot*", which is a per-version label for whether pairing is possible.
- Raw images as a component: `text:viewImage` "View page image" is "still in use and is about the title of the image in the legacy text", which is a precedent for a page-image link next to a text.
- AI label per work: a badge per version ("Aligned", "Legacy", "Annotated") is one display pattern for a short label on each work.
- Text in different languages: "References" to "paragraph or page numbers that are in original Pali manuscripts" give a stable anchor that works across every language version.
