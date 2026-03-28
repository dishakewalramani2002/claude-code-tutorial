import { useState } from "react"; // still used by individual step screens

// ─── VC1 DATA ────────────────────────────────────────────────────────────────
const VC1_CUSTOMER = {
  name: "Dana Mitchell",
  memberId: "HI-421812",
  dob: "03/14/1985",
  plan: "BlueCare PPO Gold",
  planYear: "2024",
  phone: "(412) 555-0198",
  address: "847 Maple Ave, Pittsburgh, PA 15213",
};

const VC1_BILLS = [
  { id: "CLM-001", date: "2024-02-10", provider: "UPMC Shadyside", code: "99213", desc: "Office Visit – Established Patient", amount: "$1,200.00", status: "Billed to Patient", disputed: true },
  { id: "CLM-002", date: "2024-01-03", provider: "Quest Diagnostics", code: "80053", desc: "Comprehensive Metabolic Panel", amount: "$48.00", status: "Paid", disputed: false },
  { id: "CLM-003", date: "2023-12-15", provider: "UPMC Shadyside", code: "99395", desc: "Preventive Visit", amount: "$0.00", status: "Covered 100%", disputed: false },
];

const VC1_POLICY = `POLICY: BlueCare PPO Gold – Outpatient Services

Procedure Code 99213 (Office Visit – Established Patient)
  • Covered: YES
  • Coverage level: 80% after annual deductible
  • Network requirement: In-network provider required for PPO rate

Annual Deductible Status – Plan Year 2024
  ┌─────────────────────────────────────────┐
  │  Annual Deductible:        $1,200.00    │
  │  Amount Applied YTD:           $0.00    │
  │  Remaining Deductible:     $1,200.00    │
  └─────────────────────────────────────────┘

⚠  Deductible has NOT been met. Per plan terms, the full billed
   amount applies to the member's deductible before insurance
   cost-sharing begins.

Provider Status: UPMC Shadyside is IN-NETWORK for this plan.`;

const VC1_STEPS = [
  {
    id: "lookup",
    label: "Customer Lookup",
    icon: "🔍",
    prompt: { type: "customer", text: "Ask the customer for their Member ID or date of birth before searching." },
  },
  {
    id: "bills",
    label: "Billing History",
    icon: "📄",
    prompt: { type: "customer", text: "Ask the customer which bill they are disputing, then select it from the list." },
  },
  {
    id: "detail",
    label: "Claim Detail",
    icon: "🧾",
    prompt: { type: "action", text: "Review the claim code and service details. Click 'Check Coverage Policy' to verify coverage before proceeding." },
  },
  {
    id: "policy",
    label: "Policy & Deductible",
    icon: "📋",
    prompt: { type: "action", text: "Read the deductible status carefully. Then select the correct determination below." },
  },
  {
    id: "decision",
    label: "Apply Determination",
    icon: "✅",
    prompt: { type: "action", text: "Review the determination summary, enter a case note, then click 'Apply & Finalize'." },
  },
  {
    id: "communicate",
    label: "Communicate to Customer",
    icon: "💬",
    prompt: { type: "customer", text: "Return to the customer tab and deliver the explanation below." },
  },
];

// ─── VC2 DATA ────────────────────────────────────────────────────────────────
const VC2_CUSTOMER = {
  name: "Jordan Lee",
  booking: "UA-8821",
  tier: "Silver MileagePlus",
  phone: "(213) 555-0047",
  flight: "UA 4492",
  route: "LAX → ORD → JFK",
  depTime: "Today 11:30 AM",
  status: "CANCELLED – Weather (Ground Stop ORD)",
  reason: "Weather",
};

const VC2_REbooking = [
  { id: "F1", flight: "UA 4510", route: "LAX → JFK (Direct)", dep: "Tomorrow 8:00 AM", arr: "Tomorrow 4:22 PM", seats: "Available", type: "direct" },
  { id: "F2", flight: "UA 4495", route: "LAX → ORD → JFK", dep: "Today 6:00 PM", arr: "Tomorrow 12:15 AM", seats: "Available", type: "connecting" },
  { id: "F3", flight: "AA 2341 (Partner)", route: "LAX → JFK (Direct)", dep: "Today 4:00 PM", arr: "Today 11:55 PM", seats: "3 Left", type: "partner" },
];

const VC2_POLICY = `IRREGULAR OPERATIONS POLICY – Flight Cancellations

Cancellation Reason: WEATHER (Uncontrollable)

Rebooking Rights
  • Passenger entitled to rebooking on next available United flight
  • Partner airline rebooking requires Supervisor approval
  • Seat class: Rebook in same class or higher at no charge

Compensation – Weather Cancellation (DOT Rules)
  ┌──────────────────────────────────────────────┐
  │  Cash/Miles Compensation:    NOT REQUIRED    │
  │  Hotel Voucher:              NOT REQUIRED    │
  │  Meal Voucher ($15):         ELIGIBLE ✓      │
  │    (Applies: delay > 3 hrs from orig. dep.)  │
  └──────────────────────────────────────────────┘

Note: Cash refund is required ONLY if passenger chooses not
to rebook. Full refund must be processed within 7 business days.`;

const VC2_STEPS = [
  {
    id: "lookup",
    label: "Passenger Lookup",
    icon: "🔍",
    prompt: { type: "customer", text: "Ask the passenger for their booking reference or last name + flight number." },
  },
  {
    id: "flight",
    label: "Flight Details",
    icon: "✈️",
    prompt: { type: "action", text: "Review the cancellation reason — this determines compensation eligibility. Then click 'View Rebooking Options'." },
  },
  {
    id: "rebook",
    label: "Rebooking Options",
    icon: "🔄",
    prompt: { type: "customer", text: "Return to the customer. Ask: 'I have a few options for you — do you prefer the earliest flight today, or a direct flight tomorrow morning?'" },
  },
  {
    id: "policy",
    label: "Compensation Policy",
    icon: "📋",
    prompt: { type: "action", text: "Review compensation eligibility before communicating to the passenger. Select what applies." },
  },
  {
    id: "apply",
    label: "Apply Actions",
    icon: "✅",
    prompt: { type: "action", text: "Select the passenger's preferred flight and issue the applicable compensation." },
  },
  {
    id: "communicate",
    label: "Communicate to Passenger",
    icon: "💬",
    prompt: { type: "customer", text: "Return to the customer tab and deliver the rebooking confirmation below." },
  },
];

// ─── VC3 DATA ────────────────────────────────────────────────────────────────
const VC3_CUSTOMER = {
  name: "Alex Rivera",
  booking: "UA-5521",
  flight: "UA 8834",
  route: "ORD → ATL → MIA",
  travelDate: "2 days ago",
  bagTag: "BA-0441219",
  pirRef: "MIA0441219",
  tier: "United MileagePlus",
  phone: "(312) 555-0183",
};

const VC3_TRACE = {
  status: "EXPEDITE – Active Search",
  lastScan: "ORD – Gate H7 area (Chicago O'Hare)",
  daysMissing: 2,
  pirFiled: "Yes – MIA Baggage Office",
  contents: "Blood pressure medication (14-day supply), work laptop, client presentation materials",
  estimatedResolution: "24–72 hours",
};

const VC3_POLICY = `DELAYED/MISSING BAGGAGE POLICY – United Airlines

Tracing Status: EXPEDITE (missing > 24 hours)

Interim Expense Reimbursement
  ┌──────────────────────────────────────────────────────┐
  │  Daily Allowance:        Up to $100/day              │
  │  Maximum Duration:       5 days ($500 max)           │
  │  Clothing & Toiletries:  ELIGIBLE ✓                 │
  │  Prescription Meds:      ELIGIBLE ✓ (with Rx proof) │
  │  Electronics (laptop):   NOT ELIGIBLE ✗             │
  └──────────────────────────────────────────────────────┘
  Requires original receipts submitted within 30 days.

Medical Priority Flag
  • Bags containing medication should be flagged MEDICAL PRIORITY
  • Triggers daily status checks and escalated search
  • Advise passenger to contact pharmacy for emergency supply

Final Loss Settlement (if bag not found in 21 days)
  • DOT domestic liability limit: $3,800
  • Passenger must file claim with receipts / proof of contents`;

const VC3_STEPS = [
  {
    id: "lookup",
    label: "Passenger Lookup",
    icon: "🔍",
    prompt: { type: "customer", text: "Ask the passenger for their PIR reference number or bag tag number before searching." },
  },
  {
    id: "claim",
    label: "Baggage Claim Detail",
    icon: "🧳",
    prompt: { type: "action", text: "Review the bag details and filed PIR. Click 'Check WorldTracer Status' to see the current trace." },
  },
  {
    id: "trace",
    label: "WorldTracer Status",
    icon: "🌐",
    prompt: { type: "action", text: "Note the last scan location and estimated resolution. The bag contains medication — flag as Medical Priority." },
  },
  {
    id: "policy",
    label: "Interim Expenses Policy",
    icon: "📋",
    prompt: { type: "action", text: "Review what expenses can be reimbursed. Select the correct reimbursement package for this passenger." },
  },
  {
    id: "apply",
    label: "Apply Resolution",
    icon: "✅",
    prompt: { type: "action", text: "Flag the file as Medical Priority and authorize interim expense reimbursement. Then click Confirm." },
  },
  {
    id: "communicate",
    label: "Communicate to Passenger",
    icon: "💬",
    prompt: { type: "customer", text: "Return to the customer tab and deliver the update and next steps below." },
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function PromptBanner({ prompt }) {
  const isCustomer = prompt.type === "customer";
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm font-medium mb-4 ${
      isCustomer
        ? "bg-amber-50 border border-amber-300 text-amber-800"
        : "bg-blue-50 border border-blue-300 text-blue-800"
    }`}>
      <span className="text-lg leading-none">{isCustomer ? "↩️" : "👆"}</span>
      <span>{isCustomer ? "→ Return to customer: " : ""}{prompt.text}</span>
    </div>
  );
}

function WrongAction({ onDismiss }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <span>⚠️</span>
      <span>That's not the right action here. Review the prompt above and try again.</span>
      <button onClick={onDismiss} className="ml-auto text-red-400 hover:text-red-600">✕</button>
    </div>
  );
}

function StepSidebar({ steps, current, completed }) {
  return (
    <div className="w-52 bg-gray-900 text-white flex flex-col py-6 flex-shrink-0">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-5 mb-4">Workflow</p>
      {steps.map((s, i) => {
        const done = completed.includes(s.id);
        const active = current === i;
        return (
          <div key={s.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${
            active ? "bg-gray-700 text-white font-semibold" :
            done ? "text-green-400" : "text-gray-500"
          }`}>
            <span className="w-5 text-center">
              {done ? "✓" : active ? "▶" : `${i + 1}`}
            </span>
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({ label, onClick, variant = "default" }) {
  const styles = {
    default: "bg-white border border-gray-300 text-gray-700 hover:border-gray-400",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-white border border-gray-300 text-gray-500 hover:border-gray-400",
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${styles[variant]}`}>
      {label}
    </button>
  );
}

// ─── VC1 STEP SCREENS ────────────────────────────────────────────────────────
function VC1Lookup({ onAdvance }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Member Search</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Member ID or Date of Birth..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && query.trim() && setFound(true)}
        />
        <ActionButton label="Search Member" variant="primary" onClick={() => query.trim() && setFound(true)} />
      </div>
      <div className="flex gap-2">
        <ActionButton label="New Enrollment" onClick={() => setWrong(true)} />
        <ActionButton label="View All Members" onClick={() => setWrong(true)} />
        <ActionButton label="Eligibility Checker" onClick={() => setWrong(true)} />
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}

      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mt-2">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Member Record Found
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(VC1_CUSTOMER).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g,' $1')}: </span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <ActionButton label="View Billing History →" variant="primary" onClick={onAdvance} />
            <ActionButton label="View Benefits Summary" onClick={() => setWrong(true)} />
            <ActionButton label="Open New Case" onClick={() => setWrong(true)} />
          </div>
        </div>
      )}
    </div>
  );
}

function VC1Bills({ onAdvance }) {
  const [selected, setSelected] = useState(null);
  const [wrong, setWrong] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Billing History — {VC1_CUSTOMER.name}</h2>
        <div className="flex gap-2">
          <ActionButton label="Export CSV" onClick={() => setWrong(true)} />
          <ActionButton label="Print Summary" onClick={() => setWrong(true)} />
          <ActionButton label="Create New Claim" onClick={() => setWrong(true)} />
        </div>
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-3 py-2 border border-gray-200">Claim ID</th>
            <th className="px-3 py-2 border border-gray-200">Date</th>
            <th className="px-3 py-2 border border-gray-200">Provider</th>
            <th className="px-3 py-2 border border-gray-200">Code</th>
            <th className="px-3 py-2 border border-gray-200">Description</th>
            <th className="px-3 py-2 border border-gray-200">Amount</th>
            <th className="px-3 py-2 border border-gray-200">Status</th>
            <th className="px-3 py-2 border border-gray-200"></th>
          </tr>
        </thead>
        <tbody>
          {VC1_BILLS.map(b => (
            <tr key={b.id} className={`border border-gray-200 ${selected?.id === b.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <td className="px-3 py-2 font-mono text-xs">{b.id}</td>
              <td className="px-3 py-2">{b.date}</td>
              <td className="px-3 py-2">{b.provider}</td>
              <td className="px-3 py-2 font-mono">{b.code}</td>
              <td className="px-3 py-2">{b.desc}</td>
              <td className="px-3 py-2 font-semibold">{b.amount}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  b.status === "Paid" ? "bg-green-100 text-green-700" :
                  b.status === "Covered 100%" ? "bg-green-100 text-green-700" :
                  "bg-red-100 text-red-700"
                }`}>{b.status}</span>
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => setSelected(b)}
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className={`border rounded-xl p-4 ${selected.disputed ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}>
          <p className="text-sm font-semibold text-gray-700 mb-2">Selected: {selected.id} — {selected.desc}</p>
          <div className="flex gap-2">
            {selected.disputed ? (
              <ActionButton label="Open Dispute Review →" variant="primary" onClick={onAdvance} />
            ) : (
              <ActionButton label="Open Dispute Review →" variant="primary" onClick={() => setWrong(true)} />
            )}
            <ActionButton label="Request Itemized Bill" onClick={() => setWrong(true)} />
            <ActionButton label="Contact Provider" onClick={() => setWrong(true)} />
          </div>
          {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
        </div>
      )}
    </div>
  );
}

function VC1Detail({ onAdvance }) {
  const [wrong, setWrong] = useState(false);
  const bill = VC1_BILLS[0];
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Claim Detail — {bill.id}</h2>
      <div className="grid grid-cols-2 gap-3 text-sm border border-gray-200 rounded-xl p-4 bg-white">
        {[
          ["Claim ID", bill.id], ["Status", bill.status], ["Service Date", bill.date],
          ["Provider", bill.provider], ["Procedure Code", bill.code],
          ["Description", bill.desc], ["Billed Amount", bill.amount],
          ["Member", VC1_CUSTOMER.name], ["Plan", VC1_CUSTOMER.plan],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-gray-400">{k}: </span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton label="Check Coverage Policy →" variant="primary" onClick={onAdvance} />
        <ActionButton label="Request Provider Adjustment" onClick={() => setWrong(true)} />
        <ActionButton label="Transfer to Provider Relations" onClick={() => setWrong(true)} />
        <ActionButton label="Print EOB" onClick={() => setWrong(true)} />
        <ActionButton label="Flag as Fraud" onClick={() => setWrong(true)} />
      </div>
    </div>
  );
}

function VC1Policy({ onAdvance }) {
  const [decision, setDecision] = useState(null);
  const [wrong, setWrong] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Coverage Policy — Code 99213</h2>
      <pre className="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed">
        {VC1_POLICY}
      </pre>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Determination:</p>
        <div className="flex gap-2 flex-wrap">
          <ActionButton
            label="✓ Valid — Deductible Applies (Patient Responsibility)"
            variant={decision === "valid" ? "primary" : "default"}
            onClick={() => { setDecision("valid"); setWrong(false); }}
          />
          <ActionButton label="Flag as Billing Error" onClick={() => setWrong(true)} />
          <ActionButton label="Request Insurance Adjustment" onClick={() => setWrong(true)} />
          <ActionButton label="Escalate to Medical Director" onClick={() => setWrong(true)} />
        </div>
        {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      </div>
      {decision === "valid" && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">Determination confirmed: Bill is valid. Member deductible applies.</p>
          <ActionButton label="Proceed to Apply Determination →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function VC1Decision({ onAdvance }) {
  const [note, setNote] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Apply Determination</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        <div><span className="text-gray-500">Claim:</span> <strong>CLM-001</strong> — $1,200.00 Office Visit</div>
        <div><span className="text-gray-500">Determination:</span> <strong className="text-green-700">Valid — Annual Deductible Not Met</strong></div>
        <div><span className="text-gray-500">Member Responsibility:</span> <strong>$1,200.00</strong></div>
        <div><span className="text-gray-500">Insurance Responsibility:</span> <strong>$0.00</strong> (deductible applies before cost-sharing)</div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Case Note (required)</label>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Member called to dispute CLM-001. Reviewed policy — deductible of $1,200 not met for plan year 2024. Bill is valid. Explained to member."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2">
        <ActionButton
          label="Apply & Finalize →"
          variant="primary"
          onClick={() => note.trim() ? onAdvance() : setWrong(true)}
        />
        <ActionButton label="Send for Supervisor Review" onClick={() => setWrong(true)} />
        <ActionButton label="Cancel" onClick={() => setWrong(true)} />
      </div>
      {!note.trim() && wrong && <p className="text-xs text-red-500">Please enter a case note before finalizing.</p>}
    </div>
  );
}

function VC1Communicate({ onReset }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Case Resolved — Communicate to Member</h2>
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">↩ Switch to Chat tab — say this to Dana:</p>
        <p className="text-sm text-gray-800 leading-relaxed italic">
          "Dana, I've reviewed your account and the claim in question. Your procedure code 99213 is covered under your BlueCare PPO Gold plan — however, coverage kicks in at 80% <em>after</em> your annual deductible is met. Your deductible for 2024 is $1,200, and at the time of this service it had not yet been applied. So this bill represents your deductible responsibility for the year.
          <br /><br />
          Once this $1,200 is met, your plan will cover 80% of future in-network visits automatically. Would you like me to send you a written Explanation of Benefits so you have this in writing?"
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Case Summary</p>
        <p>Case #: <strong>CASE-2024-00441</strong> | Status: <span className="text-green-700 font-semibold">Closed</span></p>
        <p>Resolution: Deductible explanation provided. Bill confirmed valid.</p>
      </div>
      <button
        onClick={onReset}
        className="text-sm text-blue-600 hover:underline"
      >
        ↺ Start New Case
      </button>
    </div>
  );
}

// ─── VC2 STEP SCREENS ────────────────────────────────────────────────────────
function VC2Lookup({ onAdvance }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Passenger Lookup</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter booking reference or last name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && query.trim() && setFound(true)}
        />
        <ActionButton label="Search" variant="primary" onClick={() => query.trim() && setFound(true)} />
      </div>
      <div className="flex gap-2">
        <ActionButton label="Upgrade Seat" onClick={() => setWrong(true)} />
        <ActionButton label="New Booking" onClick={() => setWrong(true)} />
        <ActionButton label="Lost Baggage Claim" onClick={() => setWrong(true)} />
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">Passenger Record Found</div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(VC2_CUSTOMER).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g,' $1')}: </span>
                <span className={`font-medium ${k === 'status' ? 'text-red-600' : 'text-gray-800'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <ActionButton label="View Disrupted Flight →" variant="primary" onClick={onAdvance} />
            <ActionButton label="View MileagePlus Account" onClick={() => setWrong(true)} />
          </div>
        </div>
      )}
    </div>
  );
}

function VC2Flight({ onAdvance }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Flight Detail — {VC2_CUSTOMER.flight}</h2>
      <div className="border border-red-200 bg-red-50 rounded-xl p-4 text-sm space-y-2">
        <div className="flex items-center gap-2 font-bold text-red-700 text-base">
          <span>⚠</span> FLIGHT CANCELLED
        </div>
        {[
          ["Flight", VC2_CUSTOMER.flight], ["Route", VC2_CUSTOMER.route],
          ["Original Departure", VC2_CUSTOMER.depTime], ["Cancellation Reason", VC2_CUSTOMER.reason],
          ["Details", VC2_CUSTOMER.status],
        ].map(([k, v]) => (
          <div key={k}><span className="text-gray-500">{k}: </span><strong>{v}</strong></div>
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton label="View Rebooking Options →" variant="primary" onClick={onAdvance} />
        <ActionButton label="Process Full Refund" onClick={() => setWrong(true)} />
        <ActionButton label="File Delay Report" onClick={() => setWrong(true)} />
        <ActionButton label="Upgrade to First Class" onClick={() => setWrong(true)} />
      </div>
    </div>
  );
}

function VC2Rebook({ onAdvance }) {
  const [selected, setSelected] = useState(null);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Rebooking Options — {VC2_CUSTOMER.name}</h2>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ↩ Ask the passenger their preference before selecting a flight.
      </p>
      <div className="space-y-3">
        {VC2_REbooking.map(f => (
          <div
            key={f.id}
            onClick={() => setSelected(f)}
            className={`border rounded-xl p-4 cursor-pointer transition text-sm ${
              selected?.id === f.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{f.flight} &nbsp;·&nbsp; {f.route}</p>
                <p className="text-gray-500 mt-0.5">Departs {f.dep} → Arrives {f.arr}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.type === "partner" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
              }`}>{f.seats}</span>
            </div>
            {f.type === "partner" && (
              <p className="text-xs text-yellow-700 mt-1">⚠ Partner airline — requires supervisor approval</p>
            )}
          </div>
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {selected && (
        <div className="flex gap-2">
          {selected.type === "partner"
            ? <ActionButton label="Select This Flight" variant="primary" onClick={() => setWrong(true)} />
            : <ActionButton label="Select & Check Compensation →" variant="primary" onClick={onAdvance} />
          }
          <ActionButton label="Hold Without Selecting" onClick={() => setWrong(true)} />
        </div>
      )}
    </div>
  );
}

function VC2Policy({ onAdvance }) {
  const [decision, setDecision] = useState(null);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Compensation Policy — Weather Cancellation</h2>
      <pre className="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed">
        {VC2_POLICY}
      </pre>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Select what applies to this passenger:</p>
        <div className="flex gap-2 flex-wrap">
          <ActionButton
            label="✓ Rebooking + $15 Meal Voucher"
            variant={decision === "rebook_meal" ? "primary" : "default"}
            onClick={() => { setDecision("rebook_meal"); setWrong(false); }}
          />
          <ActionButton label="Rebooking + Hotel Voucher" onClick={() => setWrong(true)} />
          <ActionButton label="Rebooking + $300 Cash Comp" onClick={() => setWrong(true)} />
          <ActionButton label="Rebooking Only (No Comp)" onClick={() => setWrong(true)} />
        </div>
        {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      </div>
      {decision === "rebook_meal" && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Correct. Rebooking + $15 meal voucher applies for weather delays exceeding 3 hours.</p>
          <ActionButton label="Apply & Confirm →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function VC2Apply({ onAdvance }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Confirm Actions</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        <div><span className="text-gray-500">New Flight:</span> <strong>UA 4510 — LAX → JFK Direct</strong></div>
        <div><span className="text-gray-500">New Departure:</span> <strong>Tomorrow 8:00 AM</strong></div>
        <div><span className="text-gray-500">New Confirmation:</span> <strong>UA-9934</strong></div>
        <div><span className="text-gray-500">Compensation:</span> <strong className="text-green-700">$15 Meal Voucher — Issued to email</strong></div>
        <div><span className="text-gray-500">Hotel:</span> <strong>Not Applicable (Weather)</strong></div>
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2">
        <ActionButton label="Confirm Rebooking + Issue Voucher →" variant="primary" onClick={onAdvance} />
        <ActionButton label="Upgrade to Business Class" onClick={() => setWrong(true)} />
        <ActionButton label="Issue Hotel Voucher" onClick={() => setWrong(true)} />
      </div>
    </div>
  );
}

function VC2Communicate({ onReset }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Case Resolved — Communicate to Passenger</h2>
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">↩ Switch to Chat tab — say this to Jordan:</p>
        <p className="text-sm text-gray-800 leading-relaxed italic">
          "Jordan, I've taken care of everything for you. I've rebooked you on UA 4510, a direct flight from LAX to JFK departing tomorrow at 8:00 AM, arriving at 4:22 PM. Your new confirmation number is UA-9934.
          <br /><br />
          I've also issued a $15 meal voucher to your email on file, which you can use in any airport restaurant today. I do want to be upfront — because this cancellation was due to a weather ground stop in Chicago, we're not able to offer additional cash compensation under DOT guidelines, but we're doing everything we can to get you to your destination as quickly as possible.
          <br /><br />
          Is there anything else I can help you with today?"
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Case Summary</p>
        <p>Case #: <strong>IRROP-2024-08821</strong> | Status: <span className="text-green-700 font-semibold">Closed</span></p>
        <p>Resolution: Rebooked UA-9934 + $15 meal voucher issued.</p>
      </div>
      <button onClick={onReset} className="text-sm text-blue-600 hover:underline">↺ Start New Case</button>
    </div>
  );
}

// ─── VC3 STEP SCREENS ────────────────────────────────────────────────────────
function VC3Lookup({ onAdvance }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Passenger & Bag Lookup</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter PIR reference or bag tag number..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && query.trim() && setFound(true)}
        />
        <ActionButton label="Search" variant="primary" onClick={() => query.trim() && setFound(true)} />
      </div>
      <div className="flex gap-2">
        <ActionButton label="New Booking" onClick={() => setWrong(true)} />
        <ActionButton label="File New Damage Claim" onClick={() => setWrong(true)} />
        <ActionButton label="Upgrade Seat" onClick={() => setWrong(true)} />
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Passenger Record Found
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(VC3_CUSTOMER).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <ActionButton label="Open Baggage Claim →" variant="primary" onClick={onAdvance} />
            <ActionButton label="View Booking Details" onClick={() => setWrong(true)} />
            <ActionButton label="Issue Flight Voucher" onClick={() => setWrong(true)} />
          </div>
        </div>
      )}
    </div>
  );
}

function VC3Claim({ onAdvance }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Baggage Claim Detail — PIR# {VC3_CUSTOMER.pirRef}</h2>
      <div className="grid grid-cols-2 gap-3 text-sm border border-gray-200 rounded-xl p-4 bg-white">
        {[
          ["Passenger", VC3_CUSTOMER.name],
          ["Bag Tag", VC3_CUSTOMER.bagTag],
          ["PIR Reference", VC3_CUSTOMER.pirRef],
          ["Flight", VC3_CUSTOMER.flight],
          ["Route", VC3_CUSTOMER.route],
          ["Travel Date", VC3_CUSTOMER.travelDate],
          ["Days Missing", "2"],
          ["Status", "EXPEDITE – Active Search"],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-gray-400">{k}: </span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
      </div>
      <div className="text-sm border border-amber-200 bg-amber-50 rounded-xl p-3">
        <span className="font-semibold text-amber-800">Declared contents: </span>
        <span className="text-amber-700">{VC3_TRACE.contents}</span>
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton label="Check WorldTracer Status →" variant="primary" onClick={onAdvance} />
        <ActionButton label="Close Claim as Found" onClick={() => setWrong(true)} />
        <ActionButton label="Issue Refund" onClick={() => setWrong(true)} />
        <ActionButton label="Transfer to Partner Airline" onClick={() => setWrong(true)} />
      </div>
    </div>
  );
}

function VC3Trace({ onAdvance }) {
  const [flagged, setFlagged] = useState(false);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">WorldTracer Status — {VC3_CUSTOMER.bagTag}</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        {[
          ["Trace Status", VC3_TRACE.status],
          ["Last Scanned", VC3_TRACE.lastScan],
          ["Days Missing", `${VC3_TRACE.daysMissing} days`],
          ["PIR Filed", VC3_TRACE.pirFiled],
          ["Est. Resolution", VC3_TRACE.estimatedResolution],
        ].map(([k, v]) => (
          <div key={k}><span className="text-gray-500">{k}: </span><strong>{v}</strong></div>
        ))}
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
        <span className="font-semibold">⚠ Medical Contents Detected:</span> Bag contains prescription medication. This file must be flagged as <strong>MEDICAL PRIORITY</strong> before proceeding.
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Required Action:</p>
        <div className="flex gap-2 flex-wrap">
          <ActionButton
            label={flagged ? "✓ MEDICAL PRIORITY Flagged" : "Flag as MEDICAL PRIORITY →"}
            variant={flagged ? "primary" : "default"}
            onClick={() => { setFlagged(true); setWrong(false); }}
          />
          <ActionButton label="Mark as Low Priority" onClick={() => setWrong(true)} />
          <ActionButton label="Close Trace" onClick={() => setWrong(true)} />
        </div>
        {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      </div>
      {flagged && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">File flagged as MEDICAL PRIORITY. Daily status checks enabled.</p>
          <ActionButton label="Review Interim Expenses Policy →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function VC3Policy({ onAdvance }) {
  const [decision, setDecision] = useState(null);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Interim Expenses Policy</h2>
      <pre className="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed">
        {VC3_POLICY}
      </pre>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Select what applies to this passenger:</p>
        <div className="flex gap-2 flex-wrap">
          <ActionButton
            label="✓ Authorize Interim Expenses + Medical Reimbursement"
            variant={decision === "interim_medical" ? "primary" : "default"}
            onClick={() => { setDecision("interim_medical"); setWrong(false); }}
          />
          <ActionButton label="Authorize Interim Expenses Only (No Medical)" onClick={() => setWrong(true)} />
          <ActionButton label="Issue Final Settlement Now" onClick={() => setWrong(true)} />
          <ActionButton label="No Reimbursement — Weather Policy" onClick={() => setWrong(true)} />
        </div>
        {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      </div>
      {decision === "interim_medical" && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Correct. Authorize up to $100/day for clothing/toiletries + medication reimbursement with prescription.</p>
          <ActionButton label="Apply & Confirm →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function VC3Apply({ onAdvance }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Confirm Resolution Actions</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        <div><span className="text-gray-500">Bag Tag:</span> <strong>{VC3_CUSTOMER.bagTag}</strong></div>
        <div><span className="text-gray-500">Priority Flag:</span> <strong className="text-red-700">MEDICAL PRIORITY ✓</strong></div>
        <div><span className="text-gray-500">Trace Status:</span> <strong>EXPEDITE – Est. resolution 24–72 hours</strong></div>
        <div><span className="text-gray-500">Interim Expenses:</span> <strong className="text-green-700">Authorized — up to $100/day (5 days max)</strong></div>
        <div><span className="text-gray-500">Medication Reimbursement:</span> <strong className="text-green-700">Eligible — pharmacy receipt + Rx required</strong></div>
        <div><span className="text-gray-500">Submission Deadline:</span> <strong>Within 30 days</strong></div>
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton label="Confirm & Send Reimbursement Form →" variant="primary" onClick={onAdvance} />
        <ActionButton label="Escalate to Supervisor" onClick={() => setWrong(true)} />
        <ActionButton label="Issue Travel Credit Instead" onClick={() => setWrong(true)} />
      </div>
    </div>
  );
}

function VC3Communicate({ onReset }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Case Updated — Communicate to Passenger</h2>
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">↩ Switch to Chat tab — say this to Alex:</p>
        <p className="text-sm text-gray-800 leading-relaxed italic">
          "Alex, I've pulled up your bag trace. Your bag is still in our system with EXPEDITE status — the last scan was in the gate area at Chicago O'Hare, and our team is actively working on it. The estimated resolution is 24 to 72 hours.
          <br /><br />
          Because your bag contains prescription medication, I've flagged the file as Medical Priority, which means your case gets daily check-ins from our baggage team. For your medication specifically, please go to any pharmacy, get an emergency supply, and save the receipt along with a copy of your prescription — we'll reimburse that fully.
          <br /><br />
          I've also authorized interim expense reimbursement of up to $100 per day for up to five days for essentials like clothing and toiletries. I'm sending a reimbursement form to your email right now. Is there anything else I can help you with?"
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Case Summary</p>
        <p>Case #: <strong>BAG-2024-04412</strong> | Status: <span className="text-yellow-600 font-semibold">Open – EXPEDITE / Medical Priority</span></p>
        <p>Resolution: Medical Priority flagged. Interim expenses authorized. Reimbursement form sent.</p>
      </div>
      <button onClick={onReset} className="text-sm text-blue-600 hover:underline">↺ Start New Case</button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function WorkflowPortal({ scenario, step, completed, onAdvance, onReset }) {
  const stepsMap = { vc1: VC1_STEPS, vc2: VC2_STEPS, vc3: VC3_STEPS };
  const steps = stepsMap[scenario] ?? VC2_STEPS;

  function advance() {
    onAdvance(steps[step].id);
  }

  const currentStepData = steps[step];

  const screenMap = {
    vc1: [VC1Lookup, VC1Bills, VC1Detail, VC1Policy, VC1Decision, VC1Communicate],
    vc2: [VC2Lookup, VC2Flight, VC2Rebook, VC2Policy, VC2Apply, VC2Communicate],
    vc3: [VC3Lookup, VC3Claim, VC3Trace, VC3Policy, VC3Apply, VC3Communicate],
  };

  const Screen = (screenMap[scenario] ?? screenMap.vc2)[Math.min(step, 5)];

  return (
    <div className="flex-1 flex overflow-hidden">
      <StepSidebar steps={steps} current={step} completed={completed} />
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-4">
          {currentStepData && <PromptBanner prompt={currentStepData.prompt} />}
          <Screen
            onAdvance={advance}
            onReset={onReset}
          />
        </div>
      </div>
    </div>
  );
}
