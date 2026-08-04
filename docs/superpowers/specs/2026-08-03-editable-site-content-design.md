# Editable site content design

**Date:** 2026-08-03  
**Status:** Approved design; implementation not started

## Goal and scope

Allow an authenticated administrator to edit all visitor-visible copy on the homepage, About page, and their shared promotional/footer areas without a code deployment. Reuse the existing Supabase `site_content` key/value table and the existing `/admin/` application. Keep pop-up event CRUD backed by the separate `popups` table and its existing editor.

This covers every human-authored string visible on the two public pages, including navigation labels, headings, paragraphs, menu copy, captions, tab labels, form prompts/placeholders, social-link labels, footer copy, and the time-bound promotional banner and modal copy. It does not add a visual page builder, image management, layout editing, link-destination editing, a CMS, or separate SEO fields. Runtime-generated values (event data, event dates/statuses, and the banner countdown), public form success/error states, and admin/authentication controls, validation messages, loading/errors, and other system UI remain fixed application strings.

## Architecture

The public site remains static HTML enhanced with vanilla JavaScript. Each editable text node retains its existing HTML as a fallback, receives a stable `data-site-content-key` attribute, and is updated only after a successful Supabase read. The current `site-content.js` module becomes the single public content loader and uses a content registry shared in concept with the admin editor.

`site_content` remains the content store:

| Column | Role |
| --- | --- |
| `key` | Stable, unique content identifier used by the public markup and admin form. |
| `body` | Plain-text value authored by the administrator. |

No JSON blobs are introduced. A key represents one editable field, which keeps updates small, migration straightforward, and the admin form understandable. Existing `about_bio` remains its current key for compatibility.

The content registry is one JavaScript object containing each key's public target, rendering mode, page, recognizable section name, admin label, field help, and view-page URL. The implementation places this shared registry in a new browser-loaded `js/content-registry.js` file, included before both `js/site-content.js` and `js/admin.js`; key definitions must not be duplicated.

## Components

### Public pages

`index.html` and `about-us.html` will retain their current visitor-visible strings inside their existing elements. Editable elements receive `data-site-content-key`; each key is loaded after DOM readiness. The existing About body target keeps `about_bio` and gains its original static bio as its fallback content.

`js/site-content.js` will:

1. Collect only keys present on the current page.
2. Select `key, body` from `site_content` for those keys.
3. Replace an element only when its returned value is a nonempty string.
4. Render every value as escaped text. For rich paragraph fields, double newlines become `<br><br>` after escaping; for headings, labels, and one-line fields, render escaped text without interpreting markup.
5. Leave existing fallback markup unchanged on missing data, empty values, or read failure; log the failure to the console without exposing an error to visitors.

For linked calls-to-action, only the visible label becomes editable. Existing hrefs and target behavior remain code-controlled. Text-like element attributes use explicit rendering modes: `placeholder` for the host form inputs/textarea and `value` for its submit control. For the banner and modal, the current link/dismissal behavior and date logic remain code-controlled; the administrator edits their visible title/message/CTA wording only. The current hardcoded calendar values are not presented as editable fields in this scope.

### Admin dashboard

`admin/index.html` will gain a **Site content** area after the pop-up editor (and before account controls). It is split into page cards and clearly named sections; each field shows its label and a short location/help sentence. Each page card includes a visible "View homepage" or "View About page" link opening the relevant public page in a new tab. A **Shared areas** card links to the homepage and explains that its content appears in the homepage/About shared chrome.

The existing pop-up form and Upcoming/Past lists remain a separate **Pop-ups** workflow and keep their current fields, CRUD operations, and `popups` table access. Content editing never changes event fields or event classification.

On authentication, `admin.js` loads all registered content keys in one query, populates one textarea or text input per field, and disables a field's save button while that field is saving. Each section has its own Save button so an edit in one area cannot overwrite untouched values elsewhere. Forms must not submit an empty or whitespace-only body; fixed inline feedback tells the admin which value needs text. Successful saves use `upsert` keyed on `key`, returning errors through the existing fixed flash-message mechanism. This makes missing new rows creatable while preserving the current `about_bio` row.

## Content registry

The implementation creates the following registry. `text` is a single-line plain-text input; `paragraphs` is a textarea where blank lines make paragraphs on the public page; `placeholder` and `value` are single-line values applied only to the named safe DOM attribute. The listed fallback is the current static text in the page at implementation time and stays in HTML.

| Page / section | Key | Field label | Mode | Help / location |
| --- | --- | --- | --- | --- |
| Shared / promo modal | `shared_promo_cta` | Promo button label | text | Button in the promotional image modal on both pages; destination stays fixed. |
| Shared / snow notice | `shared_notice_heading` | Notice heading | text | Heading in the legacy notice modal on both pages. |
| Shared / snow notice | `shared_notice_body` | Notice message | paragraphs | Message in the legacy notice modal on both pages. |
| Shared / top navigation | `shared_nav_home_label` | Home link label | text | Home link in the top navigation on both pages. |
| Shared / top navigation | `shared_nav_popups_label` | Pop-Ups link label | text | Pop-Ups link in the top navigation on both pages. |
| Shared / top navigation | `shared_nav_about_label` | About link label | text | About link in the top navigation on both pages. |
| Homepage / hero | `home_hero_heading` | Hero heading | text | Main large heading at the top of the homepage. |
| Homepage / hero | `home_hero_subtitle` | Hero subtitle | text | Parenthetical line beneath the hero heading. |
| Homepage / hero | `home_hero_intro` | Hero introduction | paragraphs | Main descriptive paragraph beside the hero image. |
| Homepage / hero | `home_hero_cta` | Hero button label | text | Button that scrolls to Pop-Ups; destination stays fixed. |
| Homepage / menu marquee | `home_marquee_chorizo` | Chorizo word | text | First word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_huevos` | Huevos word | text | Second word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_papas` | Papas word | text | Third word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_frijoles` | Frijoles word | text | Fourth word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_tortillas` | Tortillas word | text | Fifth word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_queso` | Queso word | text | Sixth word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_salsa` | Salsa word | text | Seventh word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_cebollas` | Cebollas word | text | Eighth word in the scrolling ingredient strip. |
| Homepage / menu marquee | `home_marquee_jalapenos` | Jalapeños word | text | Ninth word in the scrolling ingredient strip. |
| Homepage / menu | `home_menu_image_caption` | Menu image caption | text | Caption displayed over the menu-slider image. |
| Homepage / menu | `home_menu_chorizo_title` | Chorizo taco name | text | First menu-slider item title. |
| Homepage / menu | `home_menu_chorizo_description` | Chorizo taco description | paragraphs | First menu-slider item description. |
| Homepage / menu | `home_menu_papas_title` | Papas taco name | text | Second menu-slider item title. |
| Homepage / menu | `home_menu_papas_description` | Papas taco description | paragraphs | Second menu-slider item description. |
| Homepage / menu | `home_menu_vegan_title` | Vegan taco name | text | Third menu-slider item title. |
| Homepage / menu | `home_menu_vegan_description` | Vegan taco description | paragraphs | Third menu-slider item description. |
| Homepage / values | `home_values_heading` | Values heading | text | Heading over the values panel. |
| Homepage / values | `home_values_body` | Values description | paragraphs | Values panel copy shown in desktop/mobile layout. |
| Homepage / values | `home_values_cta` | Values button label | text | Values-panel CTA label; existing destination remains unchanged. |
| Homepage / pop-ups | `home_popups_heading` | Pop-Ups heading | text | Heading above the event tabs. |
| Homepage / pop-ups | `home_popups_upcoming_label` | Upcoming tab label | text | Upcoming-events tab; filtering behavior stays fixed. |
| Homepage / pop-ups | `home_popups_past_label` | Past tab label | text | Past-events tab; filtering behavior stays fixed. |
| Homepage / host | `home_host_heading` | Host a pop-up heading | text | Heading above the host-request form. |
| Homepage / host | `home_host_body` | Host a pop-up description | paragraphs | Intro copy next to the host-request form. |
| Homepage / host | `home_host_name_placeholder` | Name-field prompt | placeholder | Placeholder inside the host-request name field. |
| Homepage / host | `home_host_email_placeholder` | Email-field prompt | placeholder | Placeholder inside the host-request email field. |
| Homepage / host | `home_host_details_placeholder` | Event-details prompt | placeholder | Instructions inside the host-request details field. |
| Homepage / host | `home_host_submit_label` | Host request button label | value | Submit-button label; submission workflow stays fixed. |
| About / story | `about_heading` | About heading | text | Main About page heading. |
| About / story | `about_intro` | About introduction | paragraphs | First paragraph beside Rebecca's image. |
| About / story | `about_bio` | About bio | paragraphs | Existing editable second/long-form About paragraph. |
| About / follow Rebecca | `about_follow_heading` | Follow Rebecca heading | text | Heading above social links. |
| About / follow Rebecca | `about_follow_body` | Follow Rebecca description | paragraphs | Description above Substack and Instagram links. |
| About / follow Rebecca | `about_follow_substack_label` | Substack link label | text | Visible label for the fixed Substack link. |
| About / follow Rebecca | `about_follow_instagram_label` | Instagram link label | text | Visible label for the fixed Instagram link. |
| Shared / anniversary banner | `shared_banner_badge` | Banner badge | text | Short badge at the left of the anniversary banner. |
| Shared / anniversary banner | `shared_banner_message` | Banner message | text | Main anniversary-banner copy; event date/countdown code stays fixed. |
| Shared / footer | `shared_footer_contact_heading` | Contact column heading | text | Footer heading on both pages. |
| Shared / footer | `shared_footer_email_label` | Email link label | text | Visible label for the fixed mailto link. |
| Shared / footer | `shared_footer_email_action` | Email action word | text | Small action word beside the Email link. |
| Shared / footer | `shared_footer_host_label` | Host link label | text | Visible label for the fixed host link. |
| Shared / footer | `shared_footer_host_action` | Host action word | text | Small action word beside the Host link. |
| Shared / footer | `shared_footer_instagram_label` | Instagram link label | text | Visible label for the fixed Instagram link. |
| Shared / footer | `shared_footer_instagram_action` | Instagram action word | text | Small action word beside the Instagram link. |
| Shared / footer | `shared_footer_navigation_heading` | Navigation column heading | text | Footer navigation heading on both pages. |
| Shared / footer | `shared_footer_home_label` | Home link label | text | Visible label for the fixed home link. |
| Shared / footer | `shared_footer_home_action` | Home action word | text | Small action word beside the Home link. |
| Shared / footer | `shared_footer_popups_label` | Pop-Ups link label | text | Visible label for the fixed pop-ups link. |
| Shared / footer | `shared_footer_popups_action` | Pop-Ups action word | text | Small action word beside the Pop-Ups link. |
| Shared / footer | `shared_footer_about_label` | About link label | text | Visible label for the fixed About link. |
| Shared / footer | `shared_footer_about_action` | About action word | text | Small action word beside the About link. |
| Shared / footer | `shared_footer_substack_prompt` | Substack prompt | paragraphs | Footer invitation above the sign-up CTA. |
| Shared / footer | `shared_footer_substack_heading` | Substack heading | text | Short heading immediately above the Substack CTA. |
| Shared / footer | `shared_footer_substack_label` | Substack button label | text | Visible label for the fixed Substack link. |
| Shared / footer | `shared_footer_copyright` | Copyright line | text | Complete copyright line in the shared footer. |
| Shared / footer | `shared_footer_tagline` | Footer tagline | text | "Made with love" line in the shared footer. |

The duplicated footer and banner use the same keys on both pages. Their fallback values must match before applying shared attributes so a value does not render differently between pages.

## Metadata derivation

SEO metadata is not an admin form. A small public metadata binding derives page title/social title and descriptions after content loads:

| Page | Title source | Description source | Mirrored fields |
| --- | --- | --- | --- |
| Homepage | `home_hero_heading` | `home_hero_intro` | `<title>`, `og:title`, `twitter:title`; meta description, `og:description`, `twitter:description` |
| About | `about_heading` | `about_intro` | Same title and description groups |

Derivation converts paragraph text to a whitespace-normalized plain string and uses the same escaped source value; it never parses author-provided HTML. If a content row is absent, empty, or cannot load, the existing static metadata remains untouched. The implementation may add a constant brand suffix to page titles, but it must be identical for the browser title, Open Graph title, and Twitter title for each page.

## Data flow and failure behavior

1. Deployment supplies the registry, static fallback markup, and the expanded admin form.
2. A one-time seed/upsert creates every registry key with the exact current static fallback as its `body`. It must not overwrite a nonempty existing `about_bio` or any existing key value.
3. Public pages render immediately from static HTML. The content loader replaces only successful, nonempty records and then applies metadata derivation from those resolved values.
4. An authenticated editor loads the same registry, edits a field, and saves via `site_content.upsert({ key, body }, { onConflict: 'key' })`.
5. The next public fetch uses the saved content. No cache invalidation system is required because pages fetch on load.

The seed must be executed against the production Supabase project by an authorized operator because this repository has no migration files or database management tool. Before execution, the operator verifies that `site_content.key` is unique/primary and that authenticated users retain insert/update rights in addition to public read. If it is not unique, establish a unique constraint before using `onConflict: 'key'`. Store the seed as an idempotent SQL script or repeatable Supabase SQL-editor transaction supplied with implementation; do not attempt to infer a schema migration from browser code.

## Accessibility and security

- Keep semantic source elements (headings, paragraphs, anchors, buttons) and preserve existing focus behavior and link destinations.
- Associate every admin field with a `<label>` and concise help text through `aria-describedby` where applicable. Section headings create an understandable form outline; view-page links have explicit destination text.
- Do not use `innerHTML` with unescaped authored content. Escape `&`, `<`, `>`, quotes, and apostrophes before inserting the controlled paragraph breaks, or construct text/`<br>` DOM nodes directly.
- Do not make client-side auth the access-control boundary: Supabase RLS must enforce public SELECT and authenticated INSERT/UPDATE for `site_content`, and authenticated CRUD for `popups`. The publishable key is expected in browser code; no privileged key is introduced.
- Keep inputs bounded by practical HTML `maxlength` values appropriate to current layout (for example, short text fields versus long paragraphs) and validate nonempty trimmed values client-side. RLS/storage remains the authoritative protection.

## Deterministic verification

1. Run a static key-consistency check that compares all registry keys with all `data-site-content-key` attributes in `index.html` and `about-us.html`: every attribute must be registered and every registry key must have at least one public target. Maintain an explicit allowlist for runtime/system strings excluded above, then scan visible text nodes plus editable `placeholder`/`value` attributes; fail when any other human-authored public string lacks a content key.
2. Run a small DOM/unit test for rendering: special characters remain text, double newlines produce exactly one paragraph break pair, empty/missing values preserve fallback content, and a Supabase error preserves fallbacks.
3. Run a metadata test that stubs resolved content and verifies title, description, Open Graph, and Twitter fields match their designated source; verify fallback metadata remains on fetch failure.
4. Run an admin data-client test with a mocked Supabase client verifying one registry query, `upsert` with `onConflict: 'key'`, rejection of whitespace bodies, and no `popups` calls during site-content saves.
5. Manually verify at desktop and narrow mobile widths: all admin sections and view-page links are usable; a save survives reload; repeated footer/banner values render identically on homepage/About; existing pop-up add/edit/delete continues to work; keyboard navigation and labels remain intact.

## Implementation boundaries

Do not change the visual page layout, event schema/CRUD, authentication flow, link destinations, hero/menu images, banner scheduling/countdown, or introduce editing of page URLs and separate metadata fields. The implementation may remove stale hardcoded placeholder copy only by moving that exact text into its static fallback plus its seeded content row; it must never create a blank visitor experience while data is unavailable.
