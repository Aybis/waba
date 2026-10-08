# Operations and billing dashboard

The BU Monitor always renders every configured business unit, including those without WABA accounts. Empty units have an explicit setup action and are not labelled healthy. Numbers with current errors are solid red, their BU panel has a red border and an error count, and the isometric office also uses red number labels and desk floors. Selection opens the existing session trace. Historical errors alone do not turn a number red.

Usage & Cost is a monthly demo ledger independent of the live telemetry simulator. Fixtures are deterministic for each account/phone/month. They include inbound/outbound messages, agent and customer identifiers, delivery outcome, pricing category, billable evidence, and text for fragmentation review. No customer messages are fetched from ORION.

## Meta rates checked 7 October 2026

Source: https://whatsappbusiness.com/products/platform-pricing/

The public calculator's read-only pricing endpoint returned Indonesia / IDR:

| Category | Base rate per billable delivered message |
|---|---:|
| Service | 356.65 |
| Utility | 356.65 |
| Authentication | 356.65 |
| Marketing | 586.33 |

See `meta-rate-snapshot.json` for the returned utility/authentication tier schedules. The dashboard uses base-rate estimates, not tier-discounted invoices. Meta's explanatory public/developer text retrieved in the same session still described free service messages; it did not match the calculator. Therefore eligibility/free allowances are **not inferred** from that text. The demo assigns explicit simulated billable/nonbillable flags; production must obtain message pricing evidence and reconcile it against the billing ledger.

Marketing Lite is shown as a separate delivery route under marketing, not as a fifth Meta template category. Its displayed price is the marketing list-rate reference, **not a verified fixed charge for every Lite delivery**. Meta's Marketing Messages API max-price feature entered open beta in October 2026; actual delivery price may differ. Source: https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/pricing

Rates are editable and persisted separately from account configuration. Blanks mean unknown, not free. The source snapshot is not silently updated or represented as a live price feed. Estimates exclude taxes, ORION/BSP fees, auth-international, other recipient countries, and volume discounts. No cost estimate is an invoice.

## Counting and review rules

- A bubble is an outbound message attempt in the demo, including failed messages. Inbound counts are separate.
- Message ID deduplication prevents repeated copies of the same event from being charged twice.
- Only delivered messages explicitly marked billable are priced. Unknown billability or rate produces an unpriced count and a partial subtotal.
- Categories are mutually exclusive; Marketing Lite is not also summed into Marketing.
- One-word detection uses Unicode letter/number tokens. Emoji-only messages are not one-word replies.
- Review candidates contain at least two consecutive outbound messages from the same agent in one conversation, at most 30 seconds apart, including a one-word reply. A customer response, agent change, or authentication message breaks the burst.
- Savings are a counterfactual: combine a burst into one complete reply, removing all but the final bubble; count only priced, delivered, billable removed bubbles. This needs human review and is not a guaranteed saving or an agent performance verdict.
- Export CSV respects the selected month, BU/account/number scope and category. Customer identifiers/text are not exported.

## ORION integration contract

Replace `demoMessages` with authorized ORION records containing:

`id` (message ID), `businessUnitId`, `accountId`, `phoneId`, `number`, `displayName`, pseudonymous `customerId`, `conversationId`, `agent`, `at` (ISO timestamp), `date` (billing timezone), `direction`, `status`, `category`, `billable`, `market`, `currency`, `text` (restricted), and preferably actual billed amount and price source.

Production must normalize delivery status events into one message record, handle out-of-order webhooks, deduplicate webhook retries, preserve pricing/route information and effective rate dates, use account billing timezone, price recipient markets, apply portfolio-level tier rules, free allowances, and reconcile actual Marketing API charges. Keep message text access restricted. The browser fixture is not a production billing processor.

## Full-office demo coverage

On the first load of this release, every configured BU with no numbers receives one explicitly named Demo WABA account and 2–3 masked sample WA numbers. Existing accounts/numbers are kept. The expansion is saved with `demoCoverageVersion: 2`, so later intentional deletions are respected and reopening does not regenerate removed numbers. The isometric office uses up to four columns to fit all accounts; each room sign identifies its BU and account. Full display names appear on hover or in the detail panel, avoiding long overlapping labels in the all-BU view.

BU identity colors are stable across filters and shared between canvas and the top-left legend. TSO is green; red number badges remain reserved for health errors. The original duplicate four-digit TSO/DSO demo placeholders are migrated to unique masked numbers; user-entered real numbers are preserved.
