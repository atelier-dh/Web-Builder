# Moza Studio V14.9.4 — RSVP-Linked Comments

## What this revision adds

The Comments element now has a **Hubungkan ke RSVP** selector when the storage mode is **Supabase + Google Sheets**.

The selector reads RSVP forms already saved in the Moza project:
- Main RSVP forms with a saved Supabase `formId` and `orderId`.
- Additional RSVP forms that have been synced and linked to the current project (`remoteId`, `projectId`, `elementId`) and use the project's shared RSVP order.

The selected RSVP supplies the `order_id`. Apps Script uses the exact `(project_id, order_id)` pair to find the spreadsheet. This avoids relying on a project-only mapping when a project can contain more than one order.

## Resulting layout

The Comments worksheet is created inside the selected RSVP order's existing spreadsheet. It is not a separate spreadsheet file and it does not write comments into the RSVP response tab.

Example:

- `RSVP` — main RSVP responses
- `RSVP 1` — additional RSVP form
- `RSVP 2` — additional RSVP form
- `Comments` — comments mirror

When RSVP 1 and RSVP 2 share the same order, both point to the same spreadsheet. If a project uses a different order, the order-scoped mapping points to that order's spreadsheet instead.

## Files in this package

- `index.html` — Atelier persists the bridge URL and linked order returned by `wsp-sheets`.
- `moza-comments.js` — RSVP selector, connect action, order-aware comment payload and verification.
- `Code_GS_V21_4_Moza_RSVP_Linked_Comments.gs` — shared Apps Script Web App bridge.
- `supabase/functions/wsp-sheets/index.ts` — authenticated Edge Function that registers the selected project/order/spreadsheet mapping and returns the public bridge URL.
- Existing manual RSVP files and the Supabase Comments SQL are retained.

## Installation order

1. **Apps Script:** replace the shared bridge code with `Code_GS_V21_4_Moza_RSVP_Linked_Comments.gs`.
2. Deploy Apps Script as a **New version**. Keep:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Script Property `WSP_WEBHOOK_SECRET`
3. **Supabase:** replace the existing `wsp-sheets` Edge Function source with `supabase/functions/wsp-sheets/index.ts`, then deploy it.
   - Keep JWT verification disabled at the platform layer as before; the function validates the Bearer JWT and admin membership itself.
   - Keep `WSP_SHEETS_WEBHOOK_URL` set to the Apps Script `/exec` URL.
   - Keep `WSP_SHEETS_SHARED_SECRET` equal to the Apps Script `WSP_WEBHOOK_SECRET`.
4. Do not change `wsp-rsvp` for this revision.
5. Replace the Moza Studio source with this V14.9.4 package.
6. In Atelier, ensure the Main RSVP or Additional RSVP has been synced and linked to the current project.
7. Select the Comments element and choose **Supabase + Google Sheets**.
8. Under **Hubungkan ke RSVP**, select the intended RSVP (for example RSVP 1 or RSVP 2).
9. Click **Hubungkan RSVP terpilih**. Moza calls the authenticated `wsp-sheets` `get` action for that RSVP's `order_id`; the Edge Function registers the exact project/order mapping in Apps Script and returns the shared bridge URL. Moza stores the public URL and linked order in project metadata. No spreadsheet ID or shared secret is put in the exported invitation.
10. Click **Tes koneksi**, then export/publish the invitation.
11. Submit a test comment. The first mirror creates the `Comments` worksheet in the selected RSVP spreadsheet; later comments append to the same worksheet.

## Existing data and Supabase impact

- No SQL migration is required for this revision.
- No table, column, RLS policy, trigger, or existing comment row is changed.
- The existing `wsp_comments` table remains the source for displaying comments on the website.
- Google Sheets remains a mirror only.
- `wsp-rsvp` is unchanged.
- The existing manual RSVP `Code.gs` file is retained in the ZIP; use the separately named V21.4 file for the shared multi-project bridge.

## Notes and prerequisites

- The selected RSVP must have a valid `order_id`.
- Its order must already have a Google Sheets connection saved in `wedding_rsvp_sheet_connections`.
- The admin account must be signed in when clicking **Hubungkan RSVP terpilih**.
- The Apps Script URL is obtained from the server-side `WSP_SHEETS_WEBHOOK_URL` setting. The URL itself is public; the shared secret remains server-side.
- The `wsp-sheets` `get` action can now read an order-level Sheets connection even if that order does not have a legacy `wedding_rsvp_forms` row. It still requires the saved order-level spreadsheet connection to exist.
- This package reads the existing Additional RSVP metadata from Atelier; it does not alter the `wsp-dynamic-rsvp` Edge Function.
