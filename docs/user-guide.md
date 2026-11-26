# User Guide

This guide describes the app's catalog, group administration, and course-planning features.

## Choreography Search & Catalog

- Search and filter by name, level, step figures, tags (include/exclude), authors, and max count.
- Step figure matching modes: `all`, `any`, `exact` — all three are hierarchy-aware.
- Use `up to max level` instead of selecting individual levels.
- The toolbar shows the result count after every search.
- Save, rename, load, update, and delete filter presets.
- Switch between card and table views; filters and view mode persist in local storage.
- Choreographer names in cards are limited to two lines, with a fade-out on overflow; click to expand or collapse the full list.
- Create, edit, and delete choreographies with ratings (0–5).
- Set a personal level in the choreography form (create and edit, next to the official level) to override the official level; choose "Same as official" to reset it. The effective level (personal level when set, otherwise the official one) is shown in the badge, which marks a personal level and names the official level in its tooltip. Choreography search, step figure suggestions, the group max level, and choreographer statistics use the effective level; the search option "Use official level (ignore personal levels)" filters on the official level instead. Editing a choreography and the copied details use the official level.
- Track dances on a personal list: 🤍 means the dance is on your wishlist, ✅ means you have learned it. The card shows the marker before the title. Click the marker to open a small editor (like the rating) and choose 🤍, ✅ or 🔳 for no status (✕ or Escape closes the editor without a change); a dance without a marker opens the editor when you click its title. The choreography form has a "Learning Status" field. The status date ("Learned since 2026-11-24") is set automatically when the status changes; entries migrated from the old "Gelernt" and "will lernen" hashtags have no date.
- On save, invalid choreography fields show inline validation messages and their tabs are marked; edited fields are checked again on the next save.
- Add multiple choreography information entries, each with a category and description. Restart, Tag, Ending, Intro, Sequence, and Styling are seeded categories; custom categories can also be entered.
- Maintain the songs of a choreography on the "Songs" tab: title, artist and optionally a YouTube link, a Spotify link and a note. A new row appears as soon as the last one is filled in. Without your own link the YouTube and Spotify buttons search for artist and title. Only when a choreography has several songs can you mark a favorite (otherwise the first song counts as the default); the card shows the favorite prominently and lists the others as alternatives. The copied details include all songs.
- Each song can also have a tempo (BPM, 30–300), a length (as `m:ss`, e.g. `3:45`) and a genre. Genres you have already used are suggested while typing. The card, the detail view and the copied details show them, and the table view has sortable BPM, Genre and Length columns for the default song. In the advanced filters, "Music" narrows the search by BPM range, maximum length and genres; a choreography matches when one of its songs meets all the chosen criteria.
- In a course session, a choreography with several songs offers a song selection (preset: the default song); with a single song nothing needs to be chosen. The song search filter finds choreographies by any of their songs.

## Personal

- "Personal" in the sidebar opens the personal area with the **Dashboard**. While you are in this area the sidebar shows its sections as a submenu: Dashboard, Wishlist, Learned, Practice and Practice log, with the number of dances next to Wishlist, Learned and Practice (the dances to practice now). The same number is in the heading of the section. Each section has its own address (`/personal/dashboard`, `/personal/wishlist`, `/personal/learned`, `/personal/practice`, `/personal/log`). Use the marker in the card title to move a dance between the wishlist and the learned dances or to remove it.
- The search field filters the dances of the current section by name (case-insensitive, part of the name is enough): wishlist, learned dances, practice cards and the practice log. In the Practice section a search also shows matching dances that are not due yet. The counts always show the totals.
- When you mark a dance as learned (✅), today is recorded as its first practice, so it enters the practice box and comes back after the first interval. This happens once per dance: if it already has practice entries or an interval step, nothing is added.
- "Practice" is your flash card box for learned dances. The menu entry and the heading show how many dances are due. Under "Time to practice" the cards are grouped by their due date: dances without any practice first ("Due now"), then the oldest overdue date ("Overdue since …"), then "Due today". Inside a group the most urgent dance comes first. "Show dances not due yet" adds the dances of the coming days and weeks, grouped by the date they are due ("Due 2026-12-03 (4)"). Each card has two sides like a playing card: the front is the normal choreography card, the back shows the music, restarts and tags, when you practiced last, how often, and when the dance is due next. Move the pointer to the left or right edge of a card and it tilts a little towards that side; click anywhere on the card (except on buttons, links and fields, which keep their own function) and it turns completely. Click again to turn it back. Dragging over text to select it does not turn the card. Keyboard users reach a hidden "Flip card" button with Tab.
- On the back, choose the day you practiced (today by default; earlier days are fine, future days are not), optionally add a note and, for dances with several songs, the song, then click "Sure" if you remembered the dance or "Unsure" if you did not. "Unsure" brings the dance back tomorrow. The dance then moves to "Dances not due yet" until it is due again.
- The higher the level of a dance (your personal level when set), the more often it is due, especially in the beginning. After four "Sure" in a row a beginner dance comes back after 7 days, an advanced one after 3 days. The intervals grow slowly; after roughly one to one and a half years of regular practice every dance, whatever its level, comes back every half year (182 days) and stays in the box for good.
- "Log practice" records several dances at once: tick the dances, choose the day and click "Log". Use it when you practiced without the cards, also afterwards for earlier days.
- Many dances learned long ago and no idea when you practiced them? Open "Log practice", choose "Set an interval step (once, for dances I learned long ago)", select the dances ("Select all shown" selects everything the search shows) and pick a step. The step labels show after how many days the dance is due again; higher levels use the shorter value. A middle step such as step 6 means "I know this dance well". A dance is due again after that interval, never sooner; some dances come back a few days later (up to a quarter of the interval) so that they do not all return on the same day. This is no practice: your next practice continues from the chosen step. You can repeat it for a dance at any time; the newest setting counts.
- The "Dashboard" shows statistics over your learned dances: how many there are, and charts by main level (Beginner, Improver, Intermediate, Advanced; easy, low and high are merged, your personal level counts when set), tempo (BPM of the default song), genre, creation year and choreographer (the ten most frequent; a dance counts for each of its choreographers). Level, tempo and genre are donut charts with a legend (the five most frequent genres, the rest as "Other"); creation year (the year the choreography was created, not the year you learned it) and choreographer are bars, because they are ranked or ordered. Dances without the data appear as "Unknown". "Over time" shows per month how many dances you learned, how often you practiced and how big your repertoire was; "Show as table" lists the same numbers. Dances without a learning date (from the old hashtags) count as learned before the first month. The dashboard has no search field.
- The "Practice log" lists everything you logged by day, newest first. It loads 50 entries at a time; the next ones load automatically when you scroll to the end of the list (or click "Load more"). The search field filters the whole log by dance name, not only the loaded entries. Use 🗑️ to delete a wrong entry. Dancing in a course session does not count as practice.

## Choreographers

- A statistics page lists every choreographer with their total choreography count, broken down by level.
- Filter by name and/or level; sort by name or total count.
- Click a choreographer name or a level count to open a pre-filtered choreography search in a new tab.

## Dance Group Administration

- Create, rename, and delete dance groups.
- Manage dance courses per group with semester, start date, trainer, and playlist links (YouTube, Copperknob, Spotify).
- A group can have multiple courses per semester. Course IDs are optional and globally unique when provided; courses without IDs must have distinct names within the same group and semester.
- Duplicate course IDs or names are identified next to the corresponding form field.
- Course periods run from the first to the last session and may not overlap another course of the same group, even across semesters. The boundary dates are inclusive. Courses without sessions have no known period; conflicts are checked when sessions are added or their dates changed. The separate course start date does not define the period.
- Course lifecycle statuses: `running`, `planned`, `passed` — the default view shows only running courses.
- Configure a max group level per group to cap step figure suggestions.
- **Base step figures**: configure which step figures a group already knows before starting (defaults: Hip Bump, Hip Sway, Kick, Run).
- **Learned step figures**: computed from all sessions danced to date, merged with base step figures.
- **Step figure suggestions**: ranked list of figures that would unlock the most new choreographies, accounting for both learned and base step figures — available at group level and per session.
- Swap choreographies between sessions within a course.
- The course list has a "PDF Export" menu with "Before Course" and "After Course".
- Before Course PDF (German): session dates, trainer contact with vCard QR code, playlist QR codes.
- After Course PDF for participants (German, `Kursabschluss-…pdf`): per session date the dances learned there (official level, count/wall, choreographers, clickable QR codes for the Copperknob step sheet and the demo video; repetitions and missing links are omitted), the steps the group learned in the course (steps of earlier dances and the group's base figures are excluded), the trainer contact with vCard QR code, a friendly closing note signed with "Deine"/"Dein" and the trainer's name, the same privacy notice as the course PDF, and page numbers. The signature depends on the optional trainer gender (female/male); for diverse or unspecified only the name is shown. Set the gender in the trainer administration.

## Step Figure Hierarchy

- Build composite step figures from ordered component figures.
- Step figure references are protected from deletion when used in choreographies or other composites.

## Sessions & Course Planning

- Create and delete sessions; attach and remove choreographies.
- Session dates must be valid calendar dates in `YYYY-MM-DD` format.
- Deleting a course also deletes its sessions and their choreography assignments.
- Adding a dance marks it as "New" and automatically schedules repetitions in the next two existing sessions of the same course. Existing assignments are preserved without duplicates. Repetitions display their chronological number within the course ("Repeat 1", "Repeat 2", etc.).
- Removing the original assignment also removes its linked automatic repetitions; removing one repetition leaves the original and other assignments intact. Independently planned assignments are never deleted through this link.
- Reorder session contents using drag handles (mouse, touch, or keyboard: Space, arrow keys, Space; Escape cancels). Descriptions and independently planned dances move together, while dates and session IDs stay fixed. Both drag-and-drop and the two-session swap atomically rebuild automatic repetitions at the next two course dates after each original assignment. This can update repetitions outside the visible selection.
- The learned choreographies table defaults to showing only choreographies danced at least once, with a toggle to show all.

For setup and other documentation, return to the [project overview](../README.md).
