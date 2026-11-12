# CIS 91 Midterm — Automated Video Publishing Support

**Student:** Michael Parina  
**Workflow:** `MP - Midterm` (`cqEKOn8nUhem0Iyw`)  
**Webhook:** `POST https://n8n-cis091.codislabs.club/webhook/midterm-mp`  
**Exported workflow:** [`midterm/midterm-workflow.json`](https://github.com/mbp-26/cis91-automation-workflows/blob/main/midterm/midterm-workflow.json)

---

## 1. Theme

The knowledge base covers **publishing short-form video to TikTok, YouTube Shorts, and Instagram Reels**. It is organized into the four midterm categories:

1. **Upload Format** — file formats, codecs, resolution, size, upload/publishing behavior, thumbnails, duration/monetization.
2. **Captions and Discovery** — captions, titles, hashtags, links, search, SEO, audience targeting.
3. **AI Disclosure and Policy** — AI labeling, disclosure rules, copyright, comment moderation, correcting published videos.
4. **Analytics and Growth** — views, retention, watch time, traffic sources, audience growth, hooks.

---

## 2. Submission checklist

| Requirement | Status | Evidence |
|---|---|---|
| Decide on knowledge base theme | ✅ | Short-form video publishing support; four midterm categories above |
| Create knowledge base (10+ entries) | ✅ | 13 entries in `cis-midterm-knowledge-base` (id `LfSjn3DjYu3Fv0oH`) |
| Set up trigger (Webhook recommended) | ✅ | Active `POST /webhook/midterm-mp` webhook |
| Build/test AI classification independently | ✅ | `tests/independent-classification.mjs` → **4/4 passed**; results in `tests/independent-classification.json` |
| Build/test AI response generation independently | ✅ | `tests/independent-response.mjs` → structured response/next-steps/escalation; results in `tests/independent-response.json` |
| Connect all pieces | ✅ | Full workflow: webhook → classify → KB lookup → response → log → respond |
| Test with 5 diverse messages | ✅ | Direct, partial, no-match, short, long; see §8 and `tests/midterm-test-report.pdf` |
| Set up logging | ✅ | `cis-midterm-interaction-log` (id `kiE336aXGCLrTDFb`) with 5 test rows |
| Write documentation | ✅ | This file |
| Export workflow JSON to GitHub (`midterm/`) | ✅ | `midterm/midterm-workflow.json` (commit `f6cc7bb`) |

---

## 3. Architecture

```
Webhook  POST /midterm-mp
   │
   ▼
Extract Message (Code)
   │  normalizes body.message, limits to 4,000 chars
   ▼
Classify Message (AI Agent)
   │  OpenRouter: deepseek/deepseek-v4.1-flash-1017
   │  Structured Output Parser: category / confidence / reasoning
   ▼
Validate Classification (Code)
   │  canonicalizes category, clamps confidence, sets out_of_scope
   ▼
Get Knowledge Base (Data Table: cis-midterm-knowledge-base)
   │
   ▼
Match KB Entries (Code)
   │  scores all 13 entries by keyword/phrase/platform overlap
   │  + small bonus for the classified category
   │  keeps the top 6 with score > 0
   ▼
Generate Response (AI Agent)
   │  same OpenRouter model, structured output:
   │  response / next_steps / escalation
   ▼
Build Result (Code)
   │
   ▼
Make Log Row (Code)
   │
   ▼
Log Interaction (Data Table: cis-midterm-interaction-log)
   │
   ▼
Restore Response (Code)
   │
   ▼
Respond to Webhook (HTTP 200 + CORS)
```

---

## 4. Knowledge base

**Table:** `cis-midterm-knowledge-base`  
**ID:** `LfSjn3DjYu3Fv0oH`  
**Columns:** `entry_id`, `category`, `question`, `answer`, `keywords`, `platforms`

| Category | Entries |
|---|---:|
| Upload Format | 5 |
| Captions and Discovery | 3 |
| AI Disclosure and Policy | 3 |
| Analytics and Growth | 2 |
| **Total** | **13** |

The source data is in `knowledge-base.mjs`; `create-knowledge-base.mjs` idempotently upserts rows by `entry_id`. A local snapshot is in `knowledge-base.json`.

---

## 5. AI classification

### Prompt

The classifier is instructed to choose exactly one of the four categories, with disambiguation examples:

- “Why did Instagram post my Reel without the caption I wrote?” → **Upload Format** (a publishing issue).
- “What should I write in my caption?” → **Captions and Discovery** (caption content).
- “Do I need to label AI-generated narration?” → **AI Disclosure and Policy**.
- “Why do viewers leave in the first second?” → **Analytics and Growth**.

### Output schema

```json
{
  "category": "Upload Format",
  "confidence": 0.98,
  "reasoning": "The question is about a caption disappearing after posting, which is a publishing behavior issue."
}
```

### Independent test

Run:

```bash
node tests/independent-classification.mjs
```

Result: **4/4 passed**.

| Expected | Returned | Confidence |
|---|---|---:|
| Upload Format | Upload Format | 0.99 |
| Captions and Discovery | Captions and Discovery | 0.98 |
| AI Disclosure and Policy | AI Disclosure and Policy | 0.99 |
| Analytics and Growth | Analytics and Growth | 0.99 |

Full output: `tests/independent-classification.json`.

---

## 6. Knowledge-base retrieval

`Match KB Entries` scores every entry, not just entries in the classified category. This makes retrieval robust when the classifier picks a nearby category.

Scoring:
- +3 for each keyword phrase found in the message
- +1 for each keyword/platform token found
- +2 when the entry’s category matches the classifier’s category
- keep entries with score > 0, sort descending, return the top 6

If `out_of_scope` is true (confidence < 0.2), retrieval returns no entries and the response generator explicitly escalates.

---

## 7. AI response generation

### Prompt

The response agent receives:
- the original message
- category, confidence, reasoning
- the matched knowledge base entries
- the `out_of_scope` flag

It is instructed to:
1. Answer the question directly.
2. Use only knowledge-base facts (no invented platform rules).
3. Keep a professional, helpful tone.
4. Include concrete next steps.
5. Escalate when the KB does not cover the issue.
6. Explicitly decline and escalate when `out_of_scope` is true or no entries matched.

### Output schema

```json
{
  "response": "professional response text...",
  "next_steps": ["step 1", "step 2"],
  "escalation": "contact the platform help center or instructor if unresolved"
}
```

### Independent test

Run:

```bash
node tests/independent-response.mjs
```

Result: structured response, next steps, and escalation returned; checks passed. Full output: `tests/independent-response.json`.

---

## 8. Response delivery and logging

### Delivery

**Webhook Response** — the answer is returned in the webhook reply as JSON:

```json
{
  "ok": true,
  "timestamp": "2026-11-12T19:24:27.445Z",
  "message": "...",
  "classification": { "category": "...", "confidence": 0.98, "reasoning": "..." },
  "matched_entries": [{ "entry_id": "upload-03", "question": "...", "score": 12 }],
  "matched_count": 6,
  "out_of_scope": false,
  "ai_response": "...",
  "next_steps": ["..."],
  "escalation": "...",
  "delivery_status": "webhook_200"
}
```

### Interaction log

**Table:** `cis-midterm-interaction-log`  
**ID:** `kiE336aXGCLrTDFb`

| Column | Required field |
|---|---|
| `timestamp` | Timestamp |
| `message` | Original message |
| `category` | AI classification — category |
| `confidence` | AI classification — confidence |
| `reasoning` | Classification reasoning |
| `matched_entries` | Knowledge base entries matched |
| `matched_count` | Number of matched entries |
| `out_of_scope` | Low-confidence / no-match flag |
| `ai_response` | AI-generated response |
| `next_steps` | Stored as a JSON array string |
| `escalation` | Escalation path |
| `delivery_status` | `webhook_200` |

The workflow inserts the log row before returning the webhook response.

---

## 9. Five diverse test results

All tests returned HTTP 200 and were logged. Full screenshots: `tests/test-*.png`; combined PDF: `tests/midterm-test-report.pdf`.

| # | Test | Input | Category | Conf. | KB matches | Out of scope |
|---|---|---|---|---:|---:|---:|
| 1 | Direct match | “Why did Instagram post my Reel without the caption I wrote?” | Upload Format | 0.98 | 6 | false |
| 2 | Partial match | “I want more people to find my video in search. Should I focus on the caption or the hashtags?” | Captions and Discovery | 0.97 | 6 | false |
| 3 | No match | “What’s the weather in Palm Springs tomorrow, and should I bring an umbrella?” | Analytics and Growth | 0.05 | 0 | true |
| 4 | Short message | “My Reel has no caption.” | Upload Format | 0.90 | 6 | false |
| 5 | Long message | Multi-paragraph message covering ProRes/H.264, thumbnails, caption drop, AI voiceover, retention | Upload Format | 0.65 | 6 | false |

### Test 1 — Direct match

The exact KB question retrieved `upload-03` first (score 12). The response explained the Instagram web-upload caption drop and gave the edit-after-posting fix.

### Test 2 — Partial match

The question was related but not exact. Retrieval ranked `captions-01` (11) and `captions-02` (10) highest. The response combined both: put the product/claim in the first 60 characters and use about five accurate hashtags.

### Test 3 — No match

The classifier was forced into its nearest category but returned confidence `0.05`. `out_of_scope` became true, no KB entries scored above zero, and the response declined to guess the weather, pointing to weather.gov and the instructor.

### Test 4 — Short message

Even the terse message matched `upload-03` first (score 7). The response recognized it as the Instagram web-upload caption issue and noted that the KB only covers Instagram for this problem.

### Test 5 — Long message

The long message hit several categories. Retrieval returned entries from Upload Format, Analytics, and AI Policy. The response organized the answer into covered vs. uncovered issues, prioritized fixes, and escalated the ProRes/H.264 and AI-voiceover disclosure gaps.

### Artifacts

- `tests/midterm-test-report.pdf` — full report with summary and screenshots
- `tests/test-1-direct-match.png`
- `tests/test-2-partial-match.png`
- `tests/test-3-no-match.png`
- `tests/test-4-short-message.png`
- `tests/test-5-long-message.png`
- `tests/summary.json`, `tests/log-rows.json`

---

## 10. Reproduce / rebuild

```bash
cd pi-projects/midterm-webhook-app

# 1. Seed/update the knowledge base
node create-knowledge-base.mjs

# 2. Build/update the workflow and ensure the log table
node setup-workflow.mjs

# 3. Run the five end-to-end tests
cd tests
node run-tests.mjs

# 4. Regenerate the report and screenshots
node make-report.mjs
```

Run the browser app with:

```bat
run-app.bat
```

---

## 11. Notes and limitations

- The no-match test still receives a category because the classifier must choose one of the four. The low confidence, `out_of_scope: true`, zero KB matches, and the response’s explicit refusal make the mismatch clear.
- The knowledge base intentionally does not cover every platform rule. When an entry is missing, the response generator says so and escalates instead of inventing an answer.
- The webhook currently has no auth header. The upload workflow uses header auth; the midterm webhook is open for easy testing.
- The LLM used is `deepseek/deepseek-v4.1-flash-1017` through the existing `MP - OpenRouter` credential.
