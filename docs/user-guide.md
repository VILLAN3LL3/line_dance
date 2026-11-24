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
- On save, invalid choreography fields show inline validation messages and their tabs are marked; edited fields are checked again on the next save.
- Add multiple choreography information entries, each with a category and description. Restart, Tag, Ending, Intro, Sequence, and Styling are seeded categories; custom categories can also be entered.
- Maintain the songs of a choreography on the "Songs" tab: title, artist and optionally a YouTube link, a Spotify link and a note. A new row appears as soon as the last one is filled in. Without your own link the YouTube and Spotify buttons search for artist and title. Only when a choreography has several songs can you mark a favorite (otherwise the first song counts as the default); the card shows the favorite prominently and lists the others as alternatives. The copied details include all songs.
- Each song can also have a tempo (BPM, 30–300), a length (as `m:ss`, e.g. `3:45`) and a genre. Genres you have already used are suggested while typing. The card, the detail view and the copied details show them, and the table view has sortable BPM, Genre and Length columns for the default song. In the advanced filters, "Music" narrows the search by BPM range, maximum length and genres; a choreography matches when one of its songs meets all the chosen criteria.
- In a course session, a choreography with several songs offers a song selection (preset: the default song); with a single song nothing needs to be chosen. The song search filter finds choreographies by any of their songs.

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
- Export a course PDF (German): session dates, trainer contact with vCard QR code, playlist QR codes.

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
