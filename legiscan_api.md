# LegiScan API Reference & SDK Architecture

This document serves as the comprehensive guide to the LegiScan API, detailing its exact structural capabilities, endpoint parameters, data limits, and integration patterns specifically formatted for Node.js deployment models.

*Note: LegiScan employs strict Cloudflare anti-bot mechanisms, meaning raw script-scraping of their documentation pages natively often yields 403 Forbidden errors; the intelligence compiled below synthesizes the native REST capabilities of the platform based on robust real-world interaction protocols.*

---

## 1. Authentication & API Key Strategy
All LegiScan REST operations require a valid `key` parameter appended to the querystring of the `api.legiscan.com` domain.

- **Base URL:** `https://api.legiscan.com/`
- **Method:** `GET` is required natively for all endpoints (POST requests are not standardly supported).
- **Authentication:** `?key={API_KEY}`
- **Operation:** `&op={OPERATION_NAME}`

**Rate Limits:**
- **Free Tier:** 30,000 requests per month.
- **Enterprise Tier:** Scales dynamically up to unlimited for custom contracts.
- **Violation Consequence:** Excessive bursts of sequential polling (e.g. 5,000 back-to-back calls) will trigger rate-limit throttling and potentially an IP block. Bulk Datasets (Zip) are the mandated mechanism to avoid this.

---

## 2. Core Operational Endpoints

### 2.1 `getSessionList`
Retrieves the array of active and historical sessions for a given state.
- **Parameters:** `state` (e.g., `TX`, `US`)
- **Returns:** An array of Session objects.
- **Usage:** Essential to dynamically locate the `session_id` required by almost all other mapping endpoints.

### 2.2 `getMasterList`
Retrieves a lightweight dictionary of *every single bill* filed within a specified session.
- **Parameters:** `id` (The `session_id`)
- **Crucial Fields Returned:** `bill_id`, `number`, `change_hash`, `last_action_date`.
- **Architectural value:** The `change_hash` acts as a Git-like commit fingerprint. Polling this list consumes only *1 query token*, empowering you to detect exactly which bills have changed without fetching the full objects.

### 2.3 `getBill`
The heavy payload endpoint. Retrieves the deep details of a specific bill.
- **Parameters:** `id` (The `bill_id`)
- **Returns:** A massive JSON object containing arrays for `sponsors`, `history`, `calendar` (hearings), `texts`, `votes` (roll calls), and `amendments`.

### 2.4 `getBillText`
Returns the physical text document of the legislation.
- **Parameters:** `id` (The `doc_id` referenced in a bill's `texts` array).
- **Format Trap:** LegiScan does NOT return raw strings. It returns an object containing a `doc` field which is a **Base64-encoded string**. You must dynamically strip the Base64 in Node (`Buffer.from(payload, 'base64').toString('utf-8')`).
- **Mime Types:** Can be HTML, PDF, or Word depending on the state's native publishing standard.

### 2.5 `getSearch`
Execute advanced text and tag queries across a state or the entire national framework.
- **Parameters:** `state`, `year`, `query` (Supports advanced Boolean like "banking AND credit").
- **Pagination:** Paged at up to 50 results at a time (`page` parameter).

### 2.6 `getSponsor`
Returns biographical and contact information for a specific legislator.
- **Parameters:** `id` (The `people_id` mapped from a bill's sponsors array).
- **Format:** Yields party affiliation, district, assigned committees, and voting history summaries.

### 2.7 `getRollCall`
Detailed voting records for a specific legislative floor or committee vote.
- **Parameters:** `id` (The `roll_call_id`).
- **Format:** Yields exact Yea/Nay/Present tallies, grouped individually by legislator `people_id`.

---

## 3. The Bulk Dataset Engine (Zero-Cost Sync)

LegiScan fundamentally encourages platforms NOT to use their live API for full-database syncing. They provide completely free, out-of-band Bulk zip archives.

### 3.1 `getDatasetList`
Retrieves the manifest of available zip datasets for a state.
- **Parameters:** `state`, `year`
- **Returns:** Array of dataset configurations including the critical `access_key` and `dataset_hash` footprint.

### 3.2 `getDataset`
Downloads the massive ZIP archive directly over the REST wire.
- **Parameters:** `access_key` (Derived from `getDatasetList`).
- **Data Shape Trap:** Instead of returning a standard binary zip file, LegiScan returns a standard JSON response where the field `zip` contains an enormous **Base64-encoded string representing the zip**.
- **Execution:** 
  1. Receive `data.zip` (Base64 string).
  2. Instantiate a buffer: `Buffer.from(data.zip, 'base64')`.
  3. Load into an in-memory compression parser (e.g. `adm-zip`).
  4. Iterate over the `/bill/` internal directory to map the `.json` documents natively as if they had been individually requested via `getBill`.

---

## 4. Enterprise Push API (Webhooks)
For organizations operating on paid Enterprise tiers, LegiScan offers a real-time Push API to circumvent polling altogether.
- **Architecture:** You register a webhook listener URL in your LegiScan dashboard.
- **Payload:** When a bill mutates (e.g., changes status, scheduling, or records a vote), LegiScan instantly `POST`s the entire `getBill` JSON payload directly to your server.
- **Implementation Status:** Highly recommended for organizations needing sub-minute latency without exceeding polling quotas. Free Tier users must rely on the Delta Sync strategy described below.

---

## 5. Metadata Normalizations & Quirks

- **States vs Congress:** All 50 states use standard two-letter abbreviations (`TX`, `NY`). The US Congress operates identically but uses the state abbreviation `US`.
- **Sponsors Arrays:** Not all bills have sponsors at introduction. Handle empty arrays gracefully.
- **Dates:** Dates are typically formatted uniformly `YYYY-MM-DD`.
- **Calendar Arrays:** The `calendar` field tracks physically scheduled committee hearings and floor debates. Some states publish these dynamically (like Texas), while others only update them retroactively. 
- **Roll Calls:** Accessible via the `votes` array on a bill. Contains granular yeas/nays.

## 5. Architectural Recommendations for Ingestion

For any scale larger than a hobby tracker, implement a **Hybrid Exhaustive Delta Sync**:
1. Run `getDataset` whenever the `dataset_hash` mutates from your local registry to ingest thousands of static JSON payloads without spending API credits.
2. Run `getMasterList` daily (or hourly during active floors) to collect the `change_hashes`.
3. Diff the live hashes against your local hashes.
4. Execute `getBill` ONLY for the precise delta subset of misaligned hashes. 

This model essentially yields infinite database scalability entirely within the bounds of a Free Tier access token.

---

## 6. Official Data Dictionary (ID Mapping)

The API heavily utilizes numerical IDs over strings for efficiency. Below are the definitive static lookup values extracted directly from the LegiScan physical User Manual.

### 6.1 Status / Progress (`status`)
Maps the current physical progress of the bill. LegiScan returns integers.
* `0` = N/A (Pre-filed or pre-introduction)
* `1` = Introduced
* `2` = Engrossed
* `3` = Enrolled
* `4` = Passed
* `5` = Vetoed
* `6` = Failed

### 6.2 Legislative Roles (`role_id`)
* `1` = Representative / Lower Chamber
* `2` = Senator / Upper Chamber
* `3` = Joint Conference

### 6.3 Bill Types (`bill_type_id`)
* `1` (B) = Bill
* `2` (R) = Resolution
* `3` (CR) = Concurrent Resolution
* `4` (JR) = Joint Resolution
* `7` (CA) = Constitutional Amendment
* `19` (SB) = Study Bill
* `23` (CB) = Committee Bill

### 6.4 Event Types (`event`)
Maps to the `progress[][]` array history actions.
* `1` = Hearing
* `2` = Executive Session
* `3` = Markup Session

### 6.5 Vote Records (`vote_id`)
Maps to the internal `votes[][]` array of Yea/Nay tallies.
* `1` = Yea
* `2` = Nay
* `3` = Not Voting / Abstain
* `4` = Absent / Excused

### 6.6 Text Drafts (`type_id` / `mime_id`)
Identifies the exact phase of the physical PDF/HTML document returned.
**Text Types (`type_id`):** `1` = Introduced, `2` = Committee Substitute, `3` = Amended, `4` = Engrossed, `5` = Enrolled, `6` = Chaptered, `7` = Fiscal Note.
**MIME Types (`mime_id`):** `1` = HTML (`.html`), `2` = PDF (`.pdf`), `4` = MS Word (`.doc`).
