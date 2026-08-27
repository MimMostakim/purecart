# PureCart Subscriptions REST API Reference

The PureCart Subscriptions REST API provides programmatic control over the full subscription lifecycle, payment scheduling, retention flows, plan upgrades, proration calculations, and analytics reporting.

* **Base Namespace:** `/wp-json/purecart/v1`
* **Authentication:** Standard WordPress REST Nonce (`X-WP-Nonce`) or Application Passwords for authenticated calls. Webhooks and external renewals use cryptographic HMAC signature headers (`X-PureCart-Signature`).

---

## Summary of All Available Endpoints

| # | HTTP Method | Endpoint Path | Description | Access Level |
|---|:---|:---|:---|:---|
| 1 | `GET` | `/purecart/v1/subscriptions` | Query & filter subscription records | Owner or Admin |
| 2 | `GET` | `/purecart/v1/subscriptions/{id}` | Retrieve a single subscription record | Owner or Admin |
| 3 | `PATCH` | `/purecart/v1/subscriptions/{id}` | Modify subscription parameters | Owner or Admin |
| 4 | `DELETE` | `/purecart/v1/subscriptions/{id}` | Permanently delete subscription record | Admin Only |
| 5 | `GET` | `/purecart/v1/subscriptions/{id}/logs` | Retrieve chronological audit history | Admin Only |
| 5 | `POST` | `/purecart/v1/subscriptions/{id}/pause` | Pause billing with optional auto-resume | Owner or Admin |
| 6 | `POST` | `/purecart/v1/subscriptions/{id}/resume` | Unpause and resume billing | Owner or Admin |
| 7 | `POST` | `/purecart/v1/subscriptions/{id}/cancel` | Cancel immediately or at period end | Owner or Admin |
| 8 | `GET` | `/purecart/v1/subscriptions/{id}/cancellation/reasons` | Get cancellation survey reasons | Public / Owner |
| 9 | `GET` | `/purecart/v1/subscriptions/{id}/cancellation/offers` | Fetch tailored retention offers | Owner or Admin |
| 10 | `POST` | `/purecart/v1/subscriptions/{id}/cancellation/accept-offer` | Apply accepted retention offer | Owner or Admin |
| 11 | `POST` | `/purecart/v1/subscriptions/{id}/skip` | Skip the upcoming renewal cycle | Owner or Admin |
| 12 | `POST` | `/purecart/v1/subscriptions/{id}/upgrade` | Change tier / plan with proration | Owner or Admin |
| 13 | `POST` | `/purecart/v1/subscriptions/{id}/discount` | Apply manual promotional discount | Admin Only |
| 14 | `POST` | `/purecart/v1/subscriptions/{id}/renew` | Force manual renewal charge now | Admin Only |
| 15 | `POST` | `/purecart/v1/subscriptions/{id}/early-renewal` | Customer-initiated early renewal | Owner or Admin |
| 16 | `POST` | `/purecart/v1/subscriptions/{id}/retry-payment` | Retry failed dunning payment charge | Admin Only |
| 17 | `POST` | `/purecart/v1/subscriptions/{id}/send-card-update` | Generate magic link for card updates | Admin Only |
| 18 | `POST` | `/purecart/v1/subscriptions/{id}/resubscribe` | Reactivate or clone ended subscription | Owner or Admin |
| 19 | `GET` | `/purecart/v1/subscriptions/export` | Download Excel-ready UTF-8 CSV report | Admin Only |
| 20 | `GET` | `/purecart/v1/reports/subscriptions/summary` | Retrieve MRR, ARR, Churn, and KPIs | Admin Only |

---

## Detailed Endpoint Reference

---

### 1. List Subscriptions
* **URL:** `GET /wp-json/purecart/v1/subscriptions`
* **Permission:** `permission_owner_or_admin` (Admins see all subscriptions; customers see only their own).
* **Query Parameters:**
  * `status` (string, optional): Filter by status (`active`, `paused`, `past_due`, `cancelled`, `pending_cancel`, `expired`, `completed`, `trialing`).
  * `product_id` (integer, optional): Filter by WooCommerce subscription product ID.
  * `user_id` (integer, optional): Filter by WordPress customer user ID (Admins only).
  * `search` (string, optional): Search customer name, email, or order ID.
  * `page` (integer, default: `1`): Current pagination page.
  * `per_page` (integer, default: `20`, max: `100`): Results per page (`-1` returns all).
* **Response:**
  * Headers: `X-WP-Total` (total records), `X-WP-TotalPages` (total page count).
  * Body: Array of formatted `SubscriptionRecord` objects.

---

### 2. Get Single Subscription
* **URL:** `GET /wp-json/purecart/v1/subscriptions/{id}`
* **Permission:** `permission_owner_or_admin`
* **Response:** Returns the full subscription record including customer info, product details, delivery entity (licenses, SaaS account, download access), active discounts, and scheduled switch status.

---

### 3. Update Subscription
* **URL:** `PATCH /wp-json/purecart/v1/subscriptions/{id}`
* **Permission:** `permission_owner_or_admin`
* **Request Body (JSON):**
```json
{
  "recurring_amount": 29.99,
  "billing_interval": 1,
  "billing_period": "month",
  "next_payment_at": "2026-10-01 12:00:00",
  "status": "active"
}
```
* **Explanation:** Allows updating database columns on the subscription record with automatic validation and format sanitization.

---

### 4. Delete Subscription
* **URL:** `DELETE /wp-json/purecart/v1/subscriptions/{id}`
* **Permission:** `permission_admin`
* **Response (JSON):**
```json
{
  "deleted": true,
  "id": 123,
  "previous": { ... }
}
```
* **Explanation:** Permanently removes the subscription record from `wp_purecart_subscriptions` and cleans up related logs, payments, items, and linked entities. Fires `purecart_before_subscription_deleted` and `purecart_subscription_deleted` action hooks.

---

### 5. Audit & Status Logs
* **URL:** `GET /wp-json/purecart/v1/subscriptions/{id}/logs`
* **Permission:** `permission_admin`
* **Response:** Chronological array of audit trail entries:
```json
[
  {
    "id": 42,
    "subscription_id": 1,
    "event": "retention_offer_accepted",
    "note": "type=discount, reason=too_expensive",
    "created_at": "2026-08-25 06:44:34"
  }
]
```

---

### 5. Pause Subscription
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/pause`
* **Permission:** `permission_owner_or_admin`
* **Request Body (JSON):**
```json
{
  "resume_at": "2026-11-01 00:00:00"
}
```
* **Explanation:** Transitions status from `active` $\to$ `paused`. Suspends digital access (software licenses or SaaS seats) and halts recurring renewal charges. If `resume_at` is provided, Action Scheduler automatically schedules unpausing on that date.

---

### 6. Resume Subscription
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/resume`
* **Permission:** `permission_owner_or_admin`
* **Request Body:** None.
* **Explanation:** Transitions status from `paused` $\to$ `active`, reactivates software licenses/access, clears `paused_at`, and restarts recurring renewal billing from today.

---

### 7. Cancel Subscription
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/cancel`
* **Permission:** `permission_owner_or_admin`
* **Request Body (JSON):**
```json
{
  "immediately": false,
  "reason": "too_expensive"
}
```
* **Explanation:**
  * `immediately: true` $\to$ Transitions status to `cancelled`, revokes digital access instantly, and nulls `next_payment_at`.
  * `immediately: false` $\to$ Transitions status to `pending_cancel`. Access continues until the prepaid `next_payment_at` date, at which point an automated cron action finalizes cancellation.

---

### 8. Get Cancellation Reasons
* **URL:** `GET /wp-json/purecart/v1/subscriptions/{id}/cancellation/reasons`
* **Permission:** Public / Customer
* **Response:** List of cancellation survey options (`too_expensive`, `not_using`, `missing_features`, `switching`, `pausing`, `other`).

---

### 9. Get Cancellation Retention Offers
* **URL:** `GET /wp-json/purecart/v1/subscriptions/{id}/cancellation/offers?reason=too_expensive`
* **Permission:** `permission_owner_or_admin`
* **Explanation:** Evaluates business rules (subscription age, customer LTV, product-specific retention settings) and returns eligible offers (e.g. *20% discount for 3 cycles*, *30-day pause*, *plan downgrade*).

---

### 10. Accept Cancellation Retention Offer
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/cancellation/accept-offer`
* **Permission:** `permission_owner_or_admin`
* **Request Body (JSON):**
```json
{
  "offer_type": "discount",
  "reason": "too_expensive"
}
```
* **Explanation:** Aborts cancellation and applies the accepted offer directly to the subscription (e.g. sets `discount_percent = 20` and `discount_renewals_remaining = 3`).

---

### 11. Skip Next Renewal Cycle
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/skip`
* **Permission:** `permission_owner_or_admin`
* **Request Body:** None.
* **Explanation:** Advances `next_payment_at` forward by one full billing cycle without charging the customer. Increments `skip_count` and logs the skip event.

---

### 12. Change Plan / Tier Upgrade API
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/upgrade`
* **Permission:** `permission_owner_or_admin`
* **Request Body (JSON):**
```json
{
  "product_id": 54,
  "cycle": "Annual",
  "plan_label": "Pro Annual Plan",
  "amount": 99.00,
  "mode": "prorate_immediately"
}
```
* **Explanation Modes:**
  1. `prorate_immediately`: Calculates credit for unused days on the current plan, charges the prorated difference to the card on file immediately, updates license tier limits, and resets the billing cycle from today.
  2. `apply_at_renewal`: $0 charged today. Schedules `pending_switch_product` to take effect automatically on the next renewal date.
  3. `no_proration`: Immediate tier upgrade without charging today; the new price takes effect on the next renewal.

---

### 13. Apply Custom Discount
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/discount`
* **Permission:** `permission_admin`
* **Request Body (JSON):**
```json
{
  "percent": 25,
  "duration": "3 months",
  "cycles": 3
}
```
* **Explanation:** Grants an arbitrary discount to the subscription. Preserves the base `recurring_amount` while charging discounted renewals for the specified number of cycles (or 999 for `Forever`).

---

### 14. Manual Renewal (Charge Now)
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/renew`
* **Permission:** `permission_admin`
* **Request Body:** None.
* **Explanation:** Immediately triggers an off-session gateway charge for the current subscription amount and advances the renewal date by one cycle.

---

### 15. Early Customer Renewal
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/early-renewal`
* **Permission:** `permission_owner_or_admin`
* **Explanation:** Allows a customer to pay for their upcoming renewal early. Extends their billing period and refreshes quota allowances.

---

### 16. Retry Failed Payment (Dunning)
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/retry-payment`
* **Permission:** `permission_admin`
* **Explanation:** Attempts an immediate card charge for a subscription currently in `past_due` status. If successful, resets the subscription to `active` and restarts normal billing.

---

### 17. Send Card Update Link
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/send-card-update`
* **Permission:** `permission_admin`
* **Response:**
```json
{
  "token": "pc_upd_9f8a2b3c4d5e",
  "url": "https://example.com/?purecart_subscription=1&purecart_token=pc_upd_9f8a2b3c4d5e"
}
```
* **Explanation:** Generates a secure, single-use, timed token URL allowing the customer to update their credit card details without requiring password authentication.

---

### 18. Resubscribe
* **URL:** `POST /wp-json/purecart/v1/subscriptions/{id}/resubscribe`
* **Permission:** `permission_owner_or_admin`
* **Explanation:** Reactivates a `cancelled` or `expired` subscription (or clones a new active subscription with `previous_subscription_id` linked) and restarts billing starting today.

---

### 19. Export Subscriptions CSV Report
* **URL:** `GET /wp-json/purecart/v1/subscriptions/export?status=all` (also available at `/reports/subscriptions/export`)
* **Permission:** `permission_admin`
* **Response:** File stream with `Content-Type: text/csv; charset=utf-8` and UTF-8 Byte Order Mark (`\xEF\xBB\xBF`) for instant Excel compatibility.

---

### 20. Subscriptions Analytics Summary Report
* **URL:** `GET /wp-json/purecart/v1/reports/subscriptions/summary`
* **Permission:** `permission_admin`
* **Response:**
```json
{
  "active_subscriptions": 142,
  "mrr": 4850.00,
  "arr": 58200.00,
  "churn_rate_pct": 2.1,
  "avg_ltv": 320.50,
  "past_due_count": 3
}
```
