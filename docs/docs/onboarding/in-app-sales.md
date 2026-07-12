# Sales Quickstart

## Sign In

Click **Sign in with Google** and use the exact account your manager invited. The app remembers your session — you only sign in once per browser.

If you see "Account chưa được cấp quyền", wait one minute and reload. Drive permissions can take up to 60 seconds to propagate.

---

## Create a Job

**Option A — Drop PNL**

Go to `#/sales/drop`. Drag and drop your PNL Excel file. The app detects the format, shows a preview table with all shipments and cost lines, then waits for you to confirm. Click **Confirm** to save all jobs at once.

**Option B — Fill Web Form**

Go to `#/sales/new`. Fill in shipment details field by field: customer, route (POL → POD), container, ETD, carrier. Add cost and revenue lines in the table. Click **Save Draft** to keep it for later, or **Submit Job** to finalise.

---

## Check My Dashboard

Go to `#/sales/me` to see:

- This month's shipment count, revenue, margin, and TTCN commission
- Active shipments table with status and margin per job
- Pending PNLs — shipments that have cost lines but no revenue yet

---

## Quote a Customer

Go to `#/sales/quote/new`. Fill in customer name, route, container type, and at least one rate line with amount and currency.

Click **Save Draft**. If your rate is more than 15% lower than the last accepted quote for the same route, a manager must approve before you can send.

Once approved (or if no approval needed), open `#/sales/quote`, find the draft row, and click **Send to Customer**. When the customer confirms, click **Mark Accepted**. You can then convert it to a shipment with one click.
