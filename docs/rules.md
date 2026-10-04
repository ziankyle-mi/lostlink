# Rules and behavior

Part of LostLink. Main file: [../AGENTS.md](../AGENTS.md). Tables: [schema.sql](schema.sql). Security: [security.md](security.md).

## Users

- **Students:** report lost or found items, track status, search the listings, claim items.
- **Faculty and staff:** report items found in classrooms, offices, or campus grounds, and look for their own lost items. Same permissions as students.
- **Administration and security personnel (admins):** review pending reports, verify ownership claims, update statuses, and hold found items at the security office.

## How it works

1. User logs in with a DLSAU account.
2. User reports a lost or found item with name, picture, location, date, and description.
3. For found items, the finder drops the item at the security office. The system shows a reference code (for example `LL-4821`) to write on the item tag.
4. An admin reviews the report and approves or rejects it.
5. Users browse approved listings with search and filters.
6. The owner submits a claim with proof. The admin verifies it against the held item and sets the status.

## Status flow

- Found item: `pending` -> `approved` -> `claimed`
- Lost item: `pending` -> `approved` -> `resolved`
- Either: `rejected` with a reason shown to the user

"Claimed" is for found items only. A lost report is resolved, not claimed.

## Reports

- A user can edit their own report while it is `pending` or `rejected`. After approval it is locked. Only an admin can edit an approved report.
- A user can delete their own report only while it is `pending`.
- A `rejected` report shows the reason. The user can edit it and resubmit, which sets it back to `pending`.
- The date cannot be in the future. Description needs at least 10 characters.
- The duplicate warning is a warning only. It never blocks a submit.
- A user can close their own approved lost report by marking it `resolved`.
- An approved lost item page has a button: "Did you find this? Report it as found." It opens `/report` with the type set to found and the category prefilled.
- Found reports get a unique `reference_code` when created.
- If the category is "IDs and Cards", set `hide_photo = true`. The public listing shows a placeholder instead of the photo. Admins see the real photo.
- Never show reporter emails or phone numbers to other users.

## Claims

- Only approved found items can be claimed. Lost items cannot be claimed.
- A reporter cannot claim their own found report.
- A user can have one pending claim per item. Several users can claim the same item.
- A user can withdraw a claim while it is `pending` (status `withdrawn`).
- Proof description needs at least 20 characters. It should describe unique marks, contents, and when and where it was lost.
- When an admin verifies one claim, the item becomes `claimed`. All other pending claims on that item become `denied` and those users are notified.
- A `claimed` item cannot be claimed again. Hide the button and reject the request on the server.
- Flow: user clicks Claim, writes proof, admin compares it with the item at the security office, admin verifies or denies, claimant is told to visit the security office with the reference code.

## Admins

- Admins can approve, reject (reason required), verify or deny claims, and mark handover.
- Admins cannot claim items through the claim flow.
- Every admin action writes a row to `admin_log`.

## Accounts

- Only DLSAU email accounts can log in. For the demo, `DEMO_ALLOWED_EMAILS` can list extra test emails. Leave it empty in production.
- Account deletion is out of scope. An admin can set `active = false` by hand in the database.

## Prevent Errors (Shneiderman)

- Required fields: item name, category, location, date, description. Zod enforces them on the server and the form shows inline messages.
- Clear choice: the first step of `/report` is two large buttons, "Report Lost Item" and "Report Found Item".
- Duplicate warning: before the confirm step, query `items` with `pg_trgm` similarity on name, same category, same type. Show "Similar items already reported" with links. The user can still continue.
- Confirm step: a summary modal with all fields and the photo. Buttons: Edit and Submit.
- Missing info: block submit and list what is missing. Never accept a partial report.

## Visibility of System Status (Nielsen)

- Success toast after submit: "Your report has been submitted successfully."
- Status badges on every item and report: Pending, Approved, Claimed, Resolved, Rejected.
- Loading text on buttons: "Processing your request..."
- Search and filters show a result count, or "No matching items found" with a clear-filters button.
- In-app notifications when a report status changes or a claim is verified (see the table below).

## Notifications

Store each one in the `notifications` table and show them from the bell on `/profile` and the navbar.

| Event | Who gets it | Message |
| --- | --- | --- |
| Report submitted | Reporter | Your report has been submitted successfully. |
| Report approved | Reporter | Your report was approved and is now public. |
| Report rejected | Reporter | Your report was rejected: {reason}. |
| Claim submitted | Admins | New claim on {item name}. |
| Claim verified | Claimant | Your claim was verified. Visit the security office with code {reference_code}. |
| Claim denied | Claimant | Your claim was not verified. |
| Competing claim verified | Other claimants | This item was claimed by another user. |
| Lost report resolved | Reporter | Your report was closed. |
| Possible match (stretch) | Lost-item reporter | A possible match for {item name} was found. |

## Stretch features (only after steps 1 to 8 pass)

- **Match suggestions.** When an admin approves a found item, find approved lost items with the same category, a similar name (trigram), and a date within 14 days before the found date. Notify each lost-item reporter. Use one Postgres function.
- **Realtime.** Push new notifications live with Supabase Realtime.
- **Email alerts.** Send the same notifications by email with Resend.
- **Admin stats card.** On `/admin`: items reported this month, claim rate, average days to claim.
- **Stale items view.** A filter in `/admin` for approved found items older than 60 days.
