# Campus Connect: Lost & Found Portal

**Name:** Aniket Saini
**Scholar Number:** 26U020017
**Course:** FoCP (CSE-1003), IIIT Bhopal

**Live site:** https://aniketsaini31.github.io/campus-connect/

## The problem
Students lose ID cards, calculators, keys, earphones and other belongings around campus, and there is no single place to report or find them. Notice boards get missed, and found items can be claimed by the wrong person.

## What it does
- Report lost or found items, with category, location and date
- Search by item name and filter by Lost/Found, category, location and status
- Item details and a claim form
- **Verified claims:** the claimant gives a private identifying detail that is checked against the finder's hidden detail before anything is handed over
- Claim statuses: Pending, Approved, Rejected, Returned
- Records who received the item at handover
- Statistics dashboard and responsive mobile design

## Privacy
- Scholar numbers, phone numbers and private details are never shown on public pages
- Claim details can be read only by the claimant, the finder of that item, and the admin
- These rules are enforced in the database (Firestore security rules), not just in the page

## Tech
HTML, CSS and JavaScript, with Firebase Authentication (Google sign-in) and Cloud Firestore, hosted free on GitHub Pages.

## Try it
1. Browse items without signing in.
2. Sign in with Google to report an item or claim a found one.
3. The finder reviews claims from the Dashboard.
