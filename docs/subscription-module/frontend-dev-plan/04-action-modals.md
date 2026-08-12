# PureCart Subscriptions — Frontend Dev Plan — 04. Action Modals (Phase 2)

**Depends on:** `01-data-model.md`, `02-shared-components.md` (`StepIndicator`, `CancellationReasonList`,
`RetentionOfferCard`), `03-subscriptions-list-page.md` (the row actions this file upgrades).
**Goal:** replace the two row actions that outgrew a plain confirm (Cancel, Pause) with real
multi-field modals; extract the 3 existing inline modals into their own files; formalize the
remaining simple confirms (Early Renewal, Skip Cycle, SCA Reauth, Send Card Update) as reusable
config-builder functions instead of copy-pasted `openDialog({...})` blocks.

**Correction to `00-overview.md`'s original target tree:** that file originally listed
`EarlyRenewalModal.tsx`, `SkipCycleModal.tsx`, and `ScaReauthModal.tsx` as standalone modal
components. File 03 §7.1 already decided against that — those three (plus Send Card Update) are
"Kind A" popups, handled entirely by the existing shared `ConfirmDialog`. Building components for
them would duplicate what `ConfirmDialog` already renders. `00-overview.md` has been corrected;
this file builds `subscriptionDialogs.ts` (plain functions, not components) instead.

---

## 0. User Journey — what changes for the admin

Nothing about *where* these actions live changes — they're still behind the same ⋮ menus described
in `03-subscriptions-list-page.md` §0. What changes is what happens after the click.

### Cancelling a subscription — now a 3-step conversation, not one dialog

Admin opens ⋮ on Nina Patel's row (SUB-012, Design Asset Pack, $29/mo, `download` type, active) and
clicks **"Cancel Subscription."** Before this phase, that opened the shared `ConfirmDialog` straight
to "are you sure." Now it opens `CancellationFlowModal`:

**Step 1 — pick a reason:**
```
┌──────────────────────────────────────────┐
│               ●○○                          │  ← StepIndicator, step 1 of 3
│                                              │
│          Why are you cancelling?             │
│      Nina Patel · Design Asset Pack          │
│                                              │
│   ○ Too expensive                            │
│   ○ Not using it enough                      │
│   ○ Missing features I need                  │
│   ○ Switching to another product             │
│   ○ Temporary — taking a break               │
│   ○ Other                                    │
│                                              │
│                            [Next →]          │
└──────────────────────────────────────────┘
```
Admin picks "Too expensive" → "Next" enables → click it. That reason has a discount offer attached
(`CANCELLATION_REASONS` in file 01), so the flow advances to **step 2**, not straight to timing:

**Step 2 — the retention offer:**
```
┌──────────────────────────────────────────┐
│               ○●○                          │  ← step 2 of 3
│                                              │
│              Before you go…                  │
│                                              │
│   🏷  Get 20% off for 3 months               │
│       20% off your next 3 renewals.          │
│       $29/mo → $23.20/mo   for 3 months      │
│                                              │
│   [ Accept Offer ]    Continue Cancelling →  │
└──────────────────────────────────────────┘
```
Two very different outcomes from here:
- **Admin clicks "Accept Offer"** → the cancellation is **aborted entirely**. Nina's row never
  changes status — it gets a discount applied (`retentionDiscountRemaining: 3`) and a toast: *"20%
  discount applied — Nina Patel stays on Design Asset Pack."* The modal closes. This is the whole
  point of the retention flow: most of the time, "cancel" should not end in a cancellation.
- **Admin clicks "Continue Cancelling →"** → advances to **step 3**:

```
┌──────────────────────────────────────────┐
│               ○○●                          │  ← step 3 of 3
│                                              │
│          When should access end?             │
│                                              │
│   ●  Cancel at end of billing period          │
│      Access continues until 2025-02-01        │  (pre-selected — recommended)
│   ○  Cancel immediately                       │
│      Access ends now                          │
│                                              │
│    [Keep Subscription]   [Cancel Subscription]│
└──────────────────────────────────────────┘
```
Admin leaves the default selected and clicks "Cancel Subscription" → Nina's row updates to
`status: 'pending_cancel'`, `cancellationDate: '2025-02-01'` — she keeps access until then, no more
charges. If admin had picked "Cancel immediately" instead, it would go straight to
`status: 'cancelled'`.

**The reason-without-an-offer path:** if admin had picked "Other" in step 1 instead (no offer
attached), clicking "Next" skips step 2 entirely and lands directly on step 3's timing screen — the
offer step only exists when the selected reason has one.

### Pausing a subscription — now asks for how long

Admin clicks **"Pause Subscription"** on Yuki Tanaka's row (SUB-013, Developer Bootcamp, active).
Before this phase: an instant confirm. Now: `PauseDurationModal`:
```
┌──────────────────────────────────────┐
│                 (⏸)                    │
│           Pause Subscription            │
│        Yuki Tanaka · Developer Bootcamp │
│                                          │
│  [1 month] [2 months] [3 months] [Until I resume] │
│                    ↑ selected (highlighted)      │
│                                          │
│  Access continues until 2025-03-05,      │
│  then billing resumes automatically.      │
│                                          │
│         [Cancel]   [Pause Subscription]  │
└──────────────────────────────────────┘
```
Admin picks "2 months" → the body text recomputes the resume date live → clicks "Pause
Subscription" → Yuki's row updates: `status: 'paused'`, `pauseEndDate: '2025-04-05'`.

### Changing a plan — same modal, one more choice

Admin clicks **"Change Plan"** on Sarah Johnson's row, same modal as before (`03` §0), but now with
one more section at the bottom:
```
  Apply change:
   ● Immediately (prorate difference)
   ○ At next renewal (2025-06-15)
          [Confirm Plan Change]
```
Choosing "Immediately" behaves exactly like today (the plan changes now). Choosing "At next
renewal" does **not** change Sarah's plan yet — it sets `pendingSwitchProduct`/`pendingSwitchType`
(the same two fields the backend uses for retention-downgrade scheduling, file 01 §1.5) and shows a
"Scheduled" toast instead. The table's Plan-group row actions (file 03 §7.1) already know how to
show and cancel a pending switch — this is the second way (besides a retention downgrade) those
fields get populated.

### Two actions that finally exist as their own menu items

Two actions mentioned in file 03 as "deferred to Phase 2" now appear in the Billing group for
eligible rows:
```
 Send Card Update Email     ← enabled when row.cardExpiring
 Request Reauthorization    ← enabled when status is past_due or pending_reauth
```
Both are **Kind A** — plain `ConfirmDialog` content, built by a function in `subscriptionDialogs.ts`
instead of hand-written inline each time.

---

## 1. Files this phase touches

| File | What happens |
|---|---|
| `modals/CancellationFlowModal.tsx` | **NEW** — 3-step flow described above |
| `modals/PauseDurationModal.tsx` | **NEW** — duration picker |
| `modals/ChangePlanModal.tsx` | **Extracted** from `SubscriptionsPage.tsx`'s inline JSX, + the timing-toggle section |
| `modals/ApplyDiscountModal.tsx` | **Extracted**, + bulk mode (see § 6) |
| `modals/PaymentHistoryModal.tsx` | **Extracted**, no behavior change |
| `modals/subscriptionDialogs.ts` | **NEW** — 4 functions returning `ConfirmDialogProps`-shaped config objects: Early Renewal, Skip Cycle, SCA Reauth, Send Card Update |
| `SubscriptionsPage.tsx` | Row actions for Cancel/Pause swap from `openDialog({...})` to `setCancelRow(row)`/`setPauseRow(row)`; Early Renewal/Skip Cycle/SCA Reauth/Send Card Update actions call the new builder functions instead of inlining their config |
| `utils/static-data.tsx` | +1 sample row with `status: 'pending_reauth'` (§ 2) |

---

## 2. Data model addition — the `pending_reauth` sample row

File 01 flagged this as an open question and deferred it to "when Phase 2's SCA Reauth modal needs
it." It's needed now — add this row to `subscriptionsData`:

```ts
{
	id: 'SUB-017', customer: 'Carlos Mendes', customerId: 'CUST-117',
	email: 'carlos@example.com', product: 'Plugin Pro', productId: 42,
	amount: '$99/yr', amountRaw: 99, currency: 'USD',
	billing: { interval: 1, period: 'year', displayLabel: 'Yearly' }, cycle: 'Annual',
	status: 'pending_reauth', nextPayment: '2025-02-10', startDate: '2022-02-10',
	paymentMethod: { brand: 'Visa', last4: '5566', expiryMonth: 3, expiryYear: 2026, isDefault: true },
	deliveryType: 'software',
	linkedEntity: { type: 'software', licenseId: 'LIC-017', licenseKey: 'WDD-B2C3-A1D4-E5F6', domainCount: '1/1', domainsUsed: 1, domainLimit: 1 },
	paymentType: 'recurring', paymentsCompleted: 3, maxPayments: null,
	accessTiming: 'immediate', accessEndDate: null,
	pauseEndDate: null, cancellationDate: null, skipCount: 0, maxRenewals: null, maxLengthAt: null,
	churnRiskScore: 45, customerLtv: 297,
	pendingSwitchProduct: null, pendingSwitchType: null, retentionDiscountRemaining: 0,
	cardExpiryDate: '03/2026', cardExpiring: false,
	stepPrice: null, stepAfter: null, tags: [],
},
```
This makes all 10 `SubscriptionStatus` values present in the sample data (closing the gap file 01
flagged), and gives the new "Request Reauthorization" row action a realistic already-in-that-state
row to test alongside the "start from `past_due`" path.

---

## 3. `CancellationFlowModal`

```ts
// src/app/components/Subscriptions/modals/CancellationFlowModal.tsx
import type { SubscriptionRecord, RetentionOffer } from '../../../utils/subscription-types';

interface CancellationFlowModalProps {
	row: SubscriptionRecord;
	onClose: () => void;
	onCancelled: (patch: Partial<SubscriptionRecord>) => void;
	onOfferAccepted: (offer: RetentionOffer) => void;
}
```

Internal state: `step: 0 | 1 | 2`, `selectedReasonId: string | null`, `reasonText: string`,
`timing: 'end_of_period' | 'immediate'` (defaults to `'end_of_period'`).

Step transition logic:
```ts
const selectedReason = CANCELLATION_REASONS.find(r => r.id === selectedReasonId);

function goNext() {
	if (step === 0) {
		setStep(selectedReason?.offer ? 1 : 2);   // skip the offer step if this reason has none
	} else if (step === 1) {
		setStep(2);   // "Continue Cancelling →"
	}
}
```

**Step 0 body:** renders `<CancellationReasonList reasons={CANCELLATION_REASONS} selectedId={selectedReasonId} onSelect={setSelectedReasonId} textValue={reasonText} onTextChange={setReasonText} />` (component from `02-shared-components.md` § B.7). Footer: `[Next →]`, disabled until `selectedReasonId` is set.

**Step 1 body** (only reachable when `selectedReason.offer` exists): renders `<RetentionOfferCard offer={selectedReason.offer} currentAmount={row.amount} onAccept={handleAcceptOffer} onDecline={goNext} />` (component from § B.8). `handleAcceptOffer` calls `onOfferAccepted(selectedReason.offer)` then `onClose()` — the parent decides what "accepting" actually changes on the record (see § 3.1).

**Step 2 body:** two radio options (`end_of_period` pre-selected, `immediate`), each showing the
resulting access-end date computed from `row.nextPayment` (end of period) or "now" (immediate).
Footer: `[Keep Subscription]` (calls `onClose`) and `[Cancel Subscription]` (danger-styled, calls:
```ts
onCancelled(
	timing === 'immediate'
		? { status: 'cancelled', cancellationDate: new Date().toISOString().slice(0, 10) }
		: { status: 'pending_cancel', cancellationDate: row.nextPayment }
);
onClose();
```
).

`<StepIndicator steps={3} current={step} />` sits below the header on every step.

### 3.1 Wiring in `SubscriptionsPage.tsx`

```ts
const [cancelRow, setCancelRow] = useState<SubscriptionRecord | null>(null);

// Row action (replaces the old openDialog(...) call):
{ label: 'Cancel Subscription', icon: XCircle, danger: true,
  disabled: row.status === 'cancelled',
  onClick: () => setCancelRow(row) }

// Render, alongside the other modals:
{ cancelRow && (
	<CancellationFlowModal
		row={cancelRow}
		onClose={() => setCancelRow(null)}
		onCancelled={(patch) => {
			updateRow(cancelRow.id, patch);
			showToast(
				patch.status === 'cancelled'
					? `Subscription cancelled for ${cancelRow.customer}`
					: `${cancelRow.customer}'s subscription will cancel on ${patch.cancellationDate}`,
				'error'
			);
		}}
		onOfferAccepted={(offer) => {
			if (offer.type === 'discount') {
				updateRow(cancelRow.id, { retentionDiscountRemaining: /* map offer.discountDuration to a cycle count */ 3 });
			} else if (offer.type === 'pause') {
				updateRow(cancelRow.id, { status: 'paused', pauseEndDate: /* today + offer.pauseDuration days */ '' });
			} else if (offer.type === 'skip') {
				updateRow(cancelRow.id, { skipCount: cancelRow.skipCount + 1 /* + advance nextPayment one cycle */ });
			} else if (offer.type === 'downgrade') {
				updateRow(cancelRow.id, { pendingSwitchProduct: offer.downgradePlanId ?? null, pendingSwitchType: 'downgrade' });
			}
			// 'contact' type never reaches here — its card opens a support URL instead of calling onAccept
			showToast(`Retention offer applied for ${cancelRow.customer}`, 'success');
		}}
	/>
) }
```

---

## 4. `PauseDurationModal`

```ts
// src/app/components/Subscriptions/modals/PauseDurationModal.tsx
interface PauseDurationModalProps {
	row: SubscriptionRecord;
	onClose: () => void;
	onPause: (pauseEndDate: string | null) => void;   // null = "Until I resume" (indefinite)
}
```

4 duration options as a segmented button row: `1 month`, `2 months`, `3 months`, `Until I resume`
(internal state: `selectedIndex`, default `0`). Body text recomputes based on selection:
- Fixed durations: `"Access continues until {computedDate}, then billing resumes automatically."`
- "Until I resume": `"Access continues indefinitely until you resume billing manually."`

Footer: `[Cancel]` (→ `onClose`), `[Pause Subscription]` (→
`onPause(selectedIndex === 3 ? null : computedDate); onClose();`).

Wiring mirrors § 3.1: a `pauseRow` state, the "Pause Subscription" row action sets it instead of
calling `openDialog`, and `onPause` calls `updateRow(pauseRow.id, { status: 'paused', pauseEndDate })`
+ a warning toast.

---

## 5. `ChangePlanModal` — extraction + timing toggle

Extract the existing inline JSX (`SubscriptionsPage.tsx`'s Change Plan modal block) verbatim into its
own file — same props it implicitly uses today, made explicit:

```ts
// src/app/components/Subscriptions/modals/ChangePlanModal.tsx
interface ChangePlanModalProps {
	row: SubscriptionRecord;
	onClose: () => void;
	onConfirm: (patch: Partial<SubscriptionRecord>) => void;
}
```

Add one new section between the proration info banner and the footer:

```
Apply change:
 ● Immediately (prorate difference)
 ○ At next renewal ({row.nextPayment})
```

New internal state: `timing: 'immediate' | 'scheduled'` (default `'immediate'`). The confirm handler
branches:

```ts
function handleConfirm() {
	const plan = PLAN_OPTIONS[selectedPlan];
	if (timing === 'immediate') {
		onConfirm({ cycle: plan.cycle, amount: plan.amount, nextPayment: /* today + 1 cycle, or '—' for Lifetime */ '' });
	} else {
		onConfirm({ pendingSwitchProduct: plan.label, pendingSwitchType: /* 'upgrade' if new price > current, else 'downgrade' */ 'upgrade' });
	}
	onClose();
}
```

`"Scheduled"` toast copy when `timing === 'scheduled'`: `"{customer}'s plan change to {plan.label} is scheduled for {nextPayment}."`

---

## 6. `ApplyDiscountModal` — extraction + bulk mode

Extract the existing inline JSX the same way. Add one optional prop:

```ts
// src/app/components/Subscriptions/modals/ApplyDiscountModal.tsx
interface ApplyDiscountModalProps {
	row: SubscriptionRecord;                 // the "primary" row — always required, used for the price preview
	bulkRows?: SubscriptionRecord[];         // present only when opened from the bulk bar
	onClose: () => void;
	onConfirm: (targetIds: string[], discountPct: number, duration: DiscountDuration) => void;
}
```

**What changes visually in bulk mode:**
```
Single mode header:                    Bulk mode header:
 Apply Discount                         Apply Discount
 Emily Davis · SaaS Starter             Applying to 3 subscriptions

Preview (single):                      Preview (bulk):
 Current price     $49.00                Example: Emily Davis's price
 After discount    $39.20                 $49.00 → $39.20
                                          (each subscription discounts from its own price)
```
`targetIds` passed to `onConfirm` is `bulkRows ? bulkRows.map(r => r.id) : [row.id]`. The bulk bar's
"Apply Discount to All" action (file 03 § 8) opens this with `row: selected[0]-as-SubscriptionRecord`
(just for the preview math) and `bulkRows: selectedRows`.

---

## 7. `PaymentHistoryModal` — extraction only

No behavior change — straight lift of the existing inline JSX into its own file, reading from the
same `paymentHistory` lookup (now typed against `PaymentRecord[]` per file 01 § 1.6/§ 2's note to
extend that static data's type).

```ts
// src/app/components/Subscriptions/modals/PaymentHistoryModal.tsx
interface PaymentHistoryModalProps {
	row: SubscriptionRecord;
	payments: PaymentRecord[];
	onClose: () => void;
}
```

---

## 8. `subscriptionDialogs.ts` — config builders for the 4 remaining simple confirms

```ts
// src/app/components/Subscriptions/modals/subscriptionDialogs.ts
import { FastForward, SkipForward, Lock, CreditCard } from 'lucide-react';
import type { SubscriptionRecord } from '../../../utils/subscription-types';
import type { ConfirmDialogProps } from '../../ui';

export function buildEarlyRenewalDialog(row: SubscriptionRecord, onConfirm: () => void): ConfirmDialogProps {
	return {
		open: true, danger: false, icon: FastForward,
		title: 'Process Early Renewal?',
		body: `Charge ${row.amount} to ${row.customer}'s payment method now? Their billing cycle restarts from today.`,
		confirmLabel: 'Renew Now',
		onConfirm,
	};
}

export function buildSkipCycleDialog(row: SubscriptionRecord, onConfirm: () => void): ConfirmDialogProps {
	return {
		open: true, danger: false, icon: SkipForward,
		title: 'Skip Next Renewal?',
		body: `Skip ${row.customer}'s payment on ${row.nextPayment}? Access continues; the next charge moves one cycle out.`,
		confirmLabel: 'Skip Cycle',
		onConfirm,
	};
}

export function buildScaReauthDialog(row: SubscriptionRecord, onConfirm: () => void): ConfirmDialogProps {
	return {
		open: true, danger: false, icon: Lock,
		title: 'Request Payment Reauthorization',
		body: `A secure payment confirmation link will be emailed to ${row.customer}. They must re-confirm their payment method to continue. The subscription stays active for 7 days while they confirm.`,
		confirmLabel: 'Send Reauth Email',
		onConfirm,
	};
}

export function buildSendCardUpdateDialog(row: SubscriptionRecord, onConfirm: () => void): ConfirmDialogProps {
	return {
		open: true, danger: false, icon: CreditCard,
		title: 'Send Card Update Link?',
		body: `Email ${row.customer} a secure link to update their payment method?`,
		confirmLabel: 'Send Link',
		onConfirm,
	};
}
```

**Usage in `SubscriptionsPage.tsx`** (Early Renewal shown; the other 3 follow the identical pattern):
```ts
{ label: 'Early Renewal', icon: FastForward,
  disabled: row.cycle === 'Lifetime' || row.status !== 'active',
  onClick: () => openDialog(buildEarlyRenewalDialog(row, () => {
		updateRow(row.id, { nextPayment: /* advance one billing interval */ '' });
		showToast(`Payment renewed early for ${row.customer}`, 'success');
		closeDialog();
	})) }

{ label: 'Request Reauthorization', icon: Lock,
  disabled: row.status !== 'past_due' && row.status !== 'pending_reauth',
  onClick: () => openDialog(buildScaReauthDialog(row, () => {
		updateRow(row.id, { status: 'pending_reauth' });
		showToast(`Reauthorization email sent to ${row.customer}`, 'info');
		closeDialog();
	})) }

{ label: 'Send Card Update Email', icon: CreditCard,
  disabled: !row.cardExpiring,
  onClick: () => openDialog(buildSendCardUpdateDialog(row, () => {
		showToast(`Card update link sent to ${row.customer}`, 'success');
		closeDialog();
	})) }
```
This is also what the bulk bar's "Send Card Update Email (N)" action reuses per-row in a loop, and
what the table's card-expiry icon click (file 03 § 4) opens directly.

---

## 9. Updated row action reference (supersedes file 03 §§ 7.1's "deferred to Phase 2" notes)

| Action | Kind | Opens |
|---|---|---|
| Retry Payment, Update Payment Method, Extend Trial, Reinstate, Mark Split Payments Complete, Cancel Immediately (from pending_cancel) | A | inline `openDialog({...})`, unchanged from Phase 1 |
| Early Renewal, Skip Next Cycle | A | `subscriptionDialogs.ts` builders (moved out of inline in this phase) |
| Request Reauthorization, Send Card Update Email | A | `subscriptionDialogs.ts` builders (new row actions this phase) |
| **Cancel Subscription** | **B** | `CancellationFlowModal` (upgraded this phase) |
| **Pause Subscription** | **B** | `PauseDurationModal` (upgraded this phase) |
| Change Plan | B | `ChangePlanModal` (extracted + timing toggle added this phase) |
| Apply Discount (row and bulk) | B | `ApplyDiscountModal` (extracted + bulk mode added this phase) |
| View Payment History | B | `PaymentHistoryModal` (extracted this phase) |

---

## 10. Manual test checklist

- [ ] Cancellation flow: reason **with** an offer → step 1 → 2 → 3, in order; reason **without** one ("Other") → step 1 → 3 directly, indicator still renders sensibly
- [ ] Accepting a retention offer never changes `status` — verify the row stays `active` and only the offer-specific field changes (`retentionDiscountRemaining`/`pauseEndDate`/`skipCount`/`pendingSwitchProduct` depending on offer type)
- [ ] Declining takes you to step 3, not back to step 1
- [ ] Step 3 "Cancel immediately" vs "end of period" produce the correct different status/date patches
- [ ] Pause modal's 4 duration options all compute a correct resume date except "Until I resume," which sets `pauseEndDate: null`
- [ ] Change Plan's new timing toggle: "Immediately" behaves exactly as Phase 1; "At next renewal" leaves `cycle`/`amount` untouched and only sets the pending-switch fields
- [ ] Apply Discount bulk mode: opening from the bulk bar with 3 selected rows applies to all 3 IDs, not just the first
- [ ] `SUB-017` (new `pending_reauth` row) renders correctly in the table, is included in any status-based KPI/filter counts, and "Request Reauthorization" is enabled for it
- [ ] No dangling reference to `EarlyRenewalModal.tsx`/`SkipCycleModal.tsx`/`ScaReauthModal.tsx` anywhere (those files were never created — confirm `00-overview.md`'s corrected tree matches what actually got built)

---

One open question: § 3.1's `onOfferAccepted` handler has three spots marked with a comment instead
of real date/cycle math (`pauseEndDate`, `nextPayment` advancement, discount-duration-to-cycle-count
mapping). These are small, mechanical calculations but I don't want to guess your preferred date
utility approach (plain `Date` math vs. a helper you already have elsewhere in the repo that I
haven't seen) — worth a quick look at how `handlePlanChange`'s existing `'2025-02-15'`-style
hardcoded dates should generalize before Phase 3 needs the same math again in the Detail page.

Next file: `05-subscription-detail-page.md` (Phase 3 — the new per-subscription page, its 5 tabs, and
the 6 delivery-type variants of the 6th tab).
