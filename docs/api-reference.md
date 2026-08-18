# PureCart REST API Reference

**Base URL:** `https://your-site.com/wp-json/purecart/v1`

All endpoints live under the `purecart/v1` namespace (`PURECART_API_NAMESPACE`).

---

## Authentication

| Method | Used by |
|--------|---------|
| None (`__return_true`) | License activate/deactivate/check, SaaS usage, cancellation reasons |
| HMAC signature (`X-PureCart-Sig` header) | External renewal, webhook events |
| `manage_woocommerce` capability | License revoke, subscription list, logs, renew, retry-payment, send-card-update, reports |
| Owner or `manage_woocommerce` | Subscription get, pause, resume, cancel, skip, early-renewal, resubscribe, upgrade |
| Owner only (no admin bypass) | Cancellation offers, accept-offer |

---

## License

Registered in `includes/API/RestApi.php` (`PureCart\API\RestApi`).

### `POST /license/activate`

Activate a license key for a domain.

**Auth:** None (public)

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `license_key` | Yes | License key string |
| `domain` | Yes | Domain being activated |
| `environment` | No | `production` (default) or `staging` |

**Success `200`:** `{ success: true, message: "..." }`

**Error `403`:** Activation limit reached, expired, revoked, or invalid key.

---

### `POST /license/deactivate`

Deactivate a license key for a domain.

**Auth:** None (public)

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `license_key` | Yes | License key string |
| `domain` | Yes | Domain to deactivate |

**Success `200`:** `{ success: true, message: "..." }`

**Error `400`:** Key not found or domain not active.

---

### `GET /license/check`

Check license status and activation counts.

**Auth:** None (public)

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `license_key` | Yes | License key string |
| `domain` | No | Domain (empty string = key-only check) |

**Success `200`:**

```json
{
  "status": "active",
  "plan_type": "lifetime",
  "activation_limit": 5,
  "activated_count": 2,
  "expires_at": null
}
```

**Error `404`:** License key not found.

---

### `POST /license/revoke`

Revoke a license key (mark as `revoked`, all activations blocked immediately).

**Auth:** `manage_woocommerce` capability

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `license_key` | Yes | License key to revoke |

**Success `200`:** `{ success: true, message: "License revoked." }`

**Error `500`:** DB write failure.

---

## SaaS

Registered in `includes/API/RestApi.php` (`PureCart\API\RestApi`).

### `GET /saas/usage/{api_key}`

Fetch provisioning details for a SaaS account by API key.

**Auth:** None (public — key itself is the credential)

**URL param:** `api_key` — alphanumeric + underscores

**Success `200`:**

```json
{
  "plan": "pro",
  "status": "active",
  "provisioned_at": "2024-01-01 00:00:00"
}
```

**Error `401`:** API key not found.

**Error `403`:** Account is not active (suspended/cancelled).

---

## Subscriptions

Registered in `includes/Api/Subscriptions.php` (`PureCart\Api\Subscriptions`) — wired via `Subscriptions\Module` calling `->register()` on boot.

### `GET /subscriptions`

List all subscriptions. Optionally filter by status.

**Auth:** `manage_woocommerce`

**Query params:**

| Param | Required | Values |
|-------|----------|--------|
| `status` | No | `active`, `trialing`, `paused`, `past_due`, `suspended`, `pending_cancel`, `cancelled`, `expired`, `completed` |

**Success `200`:** Array of subscription objects (see [Subscription object](#subscription-object)).

---

### `GET /subscriptions/{id}`

Get a single subscription by ID.

**Auth:** Owner or `manage_woocommerce`

**Success `200`:** Subscription object.

**Error `404`:** Subscription not found.

---

### `GET /subscriptions/{id}/logs`

Get the activity log for a subscription.

**Auth:** `manage_woocommerce`

**Success `200`:** Array of log entry objects.

**Error `404`:** Subscription not found.

---

### `POST /subscriptions/{id}/pause`

Pause a subscription, optionally scheduling an auto-resume.

**Auth:** Owner or `manage_woocommerce`

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `resume_at` | No | ISO 8601 / MySQL datetime (`Y-m-d H:i:s`) at which to auto-resume |

**Success `200`:** Updated subscription object.

**Error `400`:** Pause not allowed in current state.

---

### `POST /subscriptions/{id}/resume`

Resume a paused subscription immediately.

**Auth:** Owner or `manage_woocommerce`

**Success `200`:** Updated subscription object.

**Error `400`:** Resume not allowed in current state.

---

### `POST /subscriptions/{id}/cancel`

Cancel a subscription.

**Auth:** Owner or `manage_woocommerce`

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `immediately` | No | `true` (default) = cancel now; `false` = cancel at period end |
| `reason` | No | Free-text cancellation reason |

**Success `200`:** Updated subscription object.

**Error `400`:** Cancel not allowed in current state.

---

### `POST /subscriptions/{id}/skip`

Skip the next renewal cycle.

**Auth:** Owner or `manage_woocommerce`

**Success `200`:** Updated subscription object.

**Error `400`:** Skip not allowed (e.g. already skipped or not eligible).

---

### `POST /subscriptions/{id}/early-renewal`

Trigger an early renewal immediately (customer-initiated).

**Auth:** Owner or `manage_woocommerce`

**Success `200`:** Updated subscription object.

**Error:** WP_Error from `RenewalEngine::early_renewal()`.

---

### `POST /subscriptions/{id}/resubscribe`

Resubscribe to a cancelled or expired subscription (creates a new subscription).

**Auth:** Owner or `manage_woocommerce`

**Success `200`:** New subscription object.

**Error `400`:** Subscription not eligible for resubscription.

---

### `POST /subscriptions/{id}/upgrade`

Upgrade (or downgrade) a subscription to a different product/plan.

**Auth:** Owner or `manage_woocommerce`

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `product_id` | Yes | Target WooCommerce product ID |
| `mode` | No | Proration mode key (e.g. `immediate`, `next_cycle`) |

**Success `200`:** Updated subscription object.

**Error `400`:** Missing `product_id` or upgrade rejected by `PlanUpgrade::process()`.

---

### `POST /subscriptions/{id}/renew`

Force an immediate renewal (admin-only).

**Auth:** `manage_woocommerce`

Internally identical to early-renewal — the permission check is the only difference.

**Success `200`:** Updated subscription object.

**Error:** WP_Error from `RenewalEngine::early_renewal()`.

---

### `POST /subscriptions/{id}/retry-payment`

Manually trigger a dunning retry attempt.

**Auth:** `manage_woocommerce`

**Success `200`:** Updated subscription object.

**Error `404`:** Subscription not found.

---

### `POST /subscriptions/{id}/send-card-update`

Generate a payment-method update magic link for the subscription owner.

**Auth:** `manage_woocommerce`

**Success `200`:**

```json
{
  "token": "abc123...",
  "url": "https://your-site.com/?purecart_subscription=42&purecart_token=abc123..."
}
```

**Error `404`:** Subscription not found.

---

### `GET /subscriptions/{id}/cancellation/reasons`

Return the configured list of cancellation reasons shown in the cancellation flow.

**Auth:** None (public)

**Success `200`:** Array of reason objects from `RetentionFlow::get_reasons()`.

---

### `GET /subscriptions/{id}/cancellation/offers`

Return retention offers eligible for this subscription + reason combination.

**Auth:** Owner only (no admin bypass)

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `reason` | No | Cancellation reason key selected by the customer |

**Success `200`:** Array of offer objects from `RetentionFlow::get_eligible_offers()`.

**Error `404`:** Subscription not found.

---

### `POST /subscriptions/{id}/cancellation/accept-offer`

Accept a retention offer instead of cancelling.

**Auth:** Owner only (no admin bypass)

**Body params:**

| Param | Required | Description |
|-------|----------|-------------|
| `offer_type` | Yes | Offer key (e.g. `discount`, `pause`, `downgrade`) |
| `reason` | No | Cancellation reason key |

**Success `200`:** Updated subscription object.

**Error:** WP_Error from `RetentionFlow::accept_offer()`.

---

### `POST /subscriptions/{id}/external-renewal`

Record a renewal payment processed by an external system (e.g. Stripe webhook relay).

**Auth:** HMAC signature — `X-PureCart-Sig` header, verified by `WebhookHandler::verify_signature()`

**Body:** JSON payload

| Field | Description |
|-------|-------------|
| `transaction_id` | External payment/transaction ID |
| `amount` | Amount charged (float) |

**Success `200`:** `{ "recorded": true }`

**Error `401`:** Invalid HMAC signature.

**Error `400`:** Invalid JSON body.

---

### `POST /subscriptions/{id}/webhook-event`

Handle a gateway webhook event for a subscription.

**Auth:** HMAC signature — `X-PureCart-Sig` header

**Body:** JSON event payload (structure depends on gateway)

**Success `200`:** Result from `WebhookHandler::handle()`. Duplicate/unrecognised events also return `200` (no retry expected).

**Error `401`:** Invalid HMAC signature.

**Error `400`:** Invalid JSON body.

---

## Reports

Registered in `includes/Api/Subscriptions.php`.

### `GET /reports/subscriptions/summary`

Aggregate subscription metrics for the given period.

**Auth:** `manage_woocommerce`

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `period_start` | No | MySQL datetime or date string |
| `period_end` | No | MySQL datetime or date string |

**Success `200`:** Metrics object from `SubscriptionReport::summary()`.

---

### `GET /reports/subscriptions/export`

Export subscription data as CSV or JSON.

**Auth:** `manage_woocommerce`

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `status` | No | Filter by subscription status |
| `format` | No | `json` returns a JSON array; anything else (default) returns a CSV file |

**CSV response:** `Content-Type: text/csv`, UTF-8 BOM included for Excel compatibility.

**JSON `200`:** Array of row objects from `SubscriptionReport::export_rows()`.

---

## Subscription Object

```json
{
  "id": 42,
  "user_id": 7,
  "product_id": 100,
  "order_id": 200,
  "license_id": null,
  "saas_account_id": null,
  "status": "active",
  "billing_interval": 1,
  "billing_period": "month",
  "recurring_amount": "9.99",
  "signup_fee": "0.00",
  "currency": "USD",
  "next_renewal_at": "2024-02-01 00:00:00",
  "trial_ends_at": null,
  "paused_at": null,
  "resume_at": null,
  "cancelled_at": null,
  "expires_at": null,
  "renewal_count": 3,
  "skip_count": 0,
  "retry_count": 0,
  "churn_risk_score": 12,
  "customer_ltv": "29.97",
  "created_at": "2023-11-01 00:00:00",
  "updated_at": "2024-01-01 00:00:00",
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "product_name": "Pro Plan",
  "churn_band": "low"
}
```

**`churn_band`** is derived from `churn_risk_score` by `ChurnScorer::band()`: `low` (0–25), `medium` (26–50), `high` (51–75), `critical` (76–100).

The `purecart_rest_prepare_subscription` filter can extend or modify this shape.
