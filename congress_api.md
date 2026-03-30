# Congress.gov API Integration Guide

This document outlines the capabilities discovered from the [Official Congress.gov API GitHub Repository](https://github.com/LibraryOfCongress/api.congress.gov/) that are highly relevant to extending the capabilities of the Legislative Tracker. 

Currently, our `lib/congress.js` only pulls **CRS Summaries** and basic **Amendment Counts**. However, the API provides several powerful endpoints that we can use to drastically enhance the tracker's US legislation tracking.

## 1. Member Data & Headshots (`/member`)
The member endpoint provides exhaustive details about legislators. Instead of relying purely on LegiScan for federal sponsor data, we can enrich it with:
*   **Official Portraits:** The `<depiction><imageUrl>` node provides a direct link to the legislator's official portrait on Congress.gov (e.g., `https://www.congress.gov/img/member/l000174_200.jpg`), which we can use in our UI's sponsor avatars.
*   **Contact Information:** Under `<addressInformation>`, we can pull their direct Washington DC Office Address and Phone Number.
*   **Sponsorship Tracking:** The `/member/{bioguideId}/sponsored-legislation` endpoint allows us to pull an entire history of a specific legislator's sponsored bills.

## 2. Advanced Bill Tracking Options (`/bill`)

### Sub-Endpoints for Deep Tracking
*   **Actions Timeline (`/bill/{congress}/{type}/{number}/actions`):** Contains the full chronology of what happened to the bill, including floor votes, committee referrals, and presidential action.
*   **Cosponsors (`/bill/{congress}/{type}/{number}/cosponsors`):** We currently pull LegiScan sponsors, but Congress.gov provides `isOriginalCosponsor` flags and `sponsorshipWithdrawnDate` to track exactly when support was added or revoked.
*   **CBO Cost Estimates (`/bill/{congress}/{type}/{number}/cboCostEstimates`):** This is highly valuable for corporate/financial tracking. Provides a direct link to the Congressional Budget Office's assessment of a bill's financial impact.
*   **Legislative Subject Terms (`/bill/{congress}/{type}/{number}/subjects`):** CRS analysts tag bills with specific policy areas (e.g., "Health", "Government Operations"). We can use this to build a **Taxonomy/Category filter** in our UI so users can view bills by topic.
*   **Related Bills (`/bill/{congress}/{type}/{number}/relatedbills`):** Tracks companion bills between the House and Senate, allowing our platform to link them together automatically.

### Bill Texts (`/bill/{congress}/{type}/{number}/text`)
Provides the URLs to the actual XML/PDF text of the bills at different stages of the legislative process (e.g., "Introduced in House" vs "Engrossed in Senate"). This allows us to track the evolution of the text itself.

## 3. Law Mapping
With the new `/law` endpoint, if a tracked bill is enacted to law, we can automatically pull the NARA Public Law Number (e.g., `Public Law 117-108`) and attach it to the bill record as the final resolution status.

## 4. Committees & Hearings (`/committee` and `/hearing`)
For policy advocates tracking where a bill is stuck:
*   We can map a bill directly to its assigned committee via the `committees` block, and then use the `/committee/{chamber}/{systemCode}` endpoint to pull upcoming committee hearings and markup dates, allowing us to generate alerts for users when a bill they track gets scheduled for a markup hearing.

---

## Recommended Action Plan for Phase 2
1.  **Avatar Enrichment:** Update the ingestion pipeline to cross-reference LegiScan's sponsors with the Congress `/member` API to pull in high-quality headshots and DC office data for US bills.
2.  **Topics Taxonomy:** Hook into the `/subjects` endpoint to populate the `tags` relation in our Prisma schema natively with official CRS policy terms.
3.  **CBO Estimates:** Add a "CBO Outlook" tab in the Bill Detail view that queries the cost estimate endpoint.
