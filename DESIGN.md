# Activate · Design

This file is normative. When code and this file disagree, fix one of them in the same change.

## What Activate is, in one breath

Activate shows who on a Slack team is active right now and how long each person was active in Slack today, this week and this year. Data comes from Slack presence, read every 2 minutes. It measures time **online in Slack**, not work, and the interface says so.

People who use it:
- **A teammate** opens it to see their own day and who is around.
- **A lead** glances at the team and opens a person to see their day.
- **An admin** connects a workspace.

## Point of view

Activate looks like **printed matter that is alive**. It is not a "SaaS dashboard". Data is set like type on a poster or a terminal printout, and the page moves only when the data moves.

There are two themes. Both share one structure and one set of words, and differ in how they print.

| | **Afiş** (default) | **Sinyal** |
|---|---|---|
| Idea | A concert poster for today's team | A terminal printout on Klein-blue paper |
| Ground | poster stock `#f1eee4` | Klein blue `#1d2df0` |
| Ink | `#111111` | `#eef0ff` |
| "Active" | lime `#c8d42c` sticker on ink | signal yellow `#ffe14d` |
| "Uzakta" | stone `#8a8577` sticker, card prints on plain paper | dim `#9aa3ff` |
| Accents | six tile tones (pink, sky, orange, lilac, yellow, mint), shown **only while a person is active** | none: one blue, one yellow |
| Display type | Syne ExtraBold, upper case, tracking −0.045em | Space Mono Bold |
| Text type | Manrope | JetBrains Mono |
| Edges | 2.5px ink border, square corners, 5px hard shadow | 1px dashed rule, no shadow |
| Motion | stamp: overshoot `cubic-bezier(.2,1.5,.35,1)`, 180–320ms | `steps()`: type-in, blink, invert |
| Focus | 3px ink outline, 3px offset | 1px dashed yellow outline |

Pick colours from the tokens in `app/styles/tokens.css`, never from literals in components.

## Rules that hold in both themes

- **Words are Turkish**, short and plain. "Aktif" and "uzakta" are the two states (as in Slack's Turkish UI); a stretch of activity is an "aktif aralık", never an "oturum". Durations are written `4sa 12dk`, `45dk`, `<1dk` (never `4s`, which reads as seconds), a zero as `—`, and clock times `14:02`. Days and hours are in Europe/Istanbul. The main page is called "Bugün" everywhere ("Bugüne dön", "Bugüne git").
- **Proper names keep their case.** Workspace and person names are never upper- or lower-cased by CSS (`.keep-case`): Turkish case rules turn "AI" into "aı".
- **Summary before detail.** Every page opens with the one number that matters, then the people or sessions behind it.
- **State shows in form.** An active person has a sticker or a yellow mark *and* the word "aktif". Colour alone never carries state.
- **Motion follows data.** Animation plays on load (once) and when a value changes after a refresh. Nothing loops for decoration, except the active sticker's slow wobble (Afiş), the cursor (Sinyal) and the ticker. `prefers-reduced-motion` turns all of it off.
- **Honesty.** The dashboard says, in a note and the footer, that Slack presence is not work time. Never rank people: the team list is "active first, then alphabetical", never by time.
- **Lead with the live state.** The dashboard hero is "3/7 AKTİF" (who is active right now); the team's total time sits in the sentence under it. Colour on a person card means "active now".
- **Every state is designed:** loading, empty (no workspace, no data yet, no activity that day), error, not found, signed out.
- **Theme switching** keeps the page and plays a wipe transition (View Transitions API). The choice is stored in the `activate-theme` cookie, so the server renders the right theme with no flash.

## Components

| Component | Afiş | Sinyal |
|---|---|---|
| Logo | mark (ring-bowl "a", pink dot in the counter; the dot stamps in once on load and on hover) + `ACTI` and a pink tilted `VATE` sticker, written in capitals in the source | same mark with a yellow dot + `activate▌` with blinking cursor |
| Person | tile with hard shadow and a `→`; coloured while active, plain paper while away; avatar printed in multiply | one row: `●`, name, ASCII day bar, time |
| Presence | rotated `● AKTİF` sticker (wobbles), grey `UZAKTA` sticker | `●` yellow / `○` dim + word |
| Day strip (24h) | framed bar, ink blocks for active stretches, pink "now" line | one cell per hour (per 15 min on a person page): `·` none, `▒` part, `█` mostly active; hour ruler on the person page |
| Log | ink panel, one row per event: `hh:mm` · NAME · lime `AKTİF OLDU` / grey `UZAKLAŞTI` sticker, newest last | `hh:mm name aktif oldu` log, newest last |
| Heatmap | square cells, five steps from stock to lime to ink | one digit per day: whole hours active (`·` none, `+` ten or more), brightest at 6h+ |
| Button | ink border, hard shadow, presses into its shadow | `[ label ]`, hover inverts |
| Loading | striped skeleton blocks | braille spinner `⠋⠙⠹⠸` + `yükleniyor` |
| Empty | big poster line + one sentence | `> sinyal yok` + one sentence |
| Live status | `● CANLI · 40 SN ÖNCE GÜNCELLENDİ`, or `SON VERİ 12 DK ÖNCE` after 6 minutes without data | same words, lower case |

## Data the UI relies on

- `lib/dashboard.ts` builds what pages show: today's people with their sessions as minutes from local midnight, today's events (became active / went away), a person's day, week and year.
- Pages are server components; `components/live/LiveRefresh.tsx` re-renders them every 30 seconds while the tab is visible.
- Access: a person sees only workspaces they are a member of (`lib/access.ts`); every page and route checks it.
