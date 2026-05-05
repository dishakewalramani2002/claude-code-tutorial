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
  contents: "Blood pressure medication (14-day supply), formal clothes, client documents",
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
  │  Electronics:            NOT ELIGIBLE ✗             │
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

function StepSidebar({ steps, current, completed, onGoToStep }) {
  return (
    <div className="w-52 bg-gray-900 text-white flex flex-col py-6 flex-shrink-0">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-5 mb-4">Workflow</p>
      {steps.map((s, i) => {
        const done = completed.includes(s.id);
        const active = current === i;
        const canNavigate = i <= current || completed.includes(s.id);
        return (
          <div
            key={s.id}
            onClick={() => canNavigate && onGoToStep(i)}
            className={`flex items-center gap-3 px-5 py-3 text-sm ${
              active ? "bg-gray-700 text-white font-semibold" :
              done ? "text-green-400" : "text-gray-500"
            } ${canNavigate ? "cursor-pointer hover:bg-gray-800" : "cursor-default"}`}
          >
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

// ─── FINANCE DATA ─────────────────────────────────────────────────────────────
const LOAN_DELAY_CUSTOMER = {
  name: "Alex Chen",
  loanId: "LN-2024-00892",
  type: "Personal Loan",
  amount: "$15,000",
  appliedDate: "2026-03-10",
  phone: "(415) 555-0172",
  status: "PENDING – Under Review",
};

const LOAN_DELAY_STATUS = {
  stage: "Underwriting Review",
  submittedDate: "2026-03-10",
  expectedDate: "2026-03-17 (original)",
  currentDelay: "11 days overdue",
  delayReason: "Additional income verification required",
  assignedTo: "Underwriting Team B",
  nextStep: "Income documents resubmission",
};

const LOAN_DELAY_POLICY = `LOAN PROCESSING POLICY – Personal Loans

Standard Processing Timeline
  • Application to decision:     5–7 business days (standard)
  • Document verification:       2–3 business days
  • Disbursement after approval: 1–2 business days

Delay Causes & Actions
  ┌──────────────────────────────────────────────────┐
  │  Income Verification:  Request updated documents  │
  │  Credit Flag:          Escalate to Risk Team      │
  │  System Hold:          Escalate to Ops Support    │
  │  Missing Documents:    Send document request      │
  └──────────────────────────────────────────────────┘

Customer Communication Standard
  • Delays > 3 business days: proactive outreach required
  • Provide updated ETA and reason at every contact
  • Document all customer contacts in case notes`;

const LOAN_DELAY_STEPS = [
  { id: "lookup", label: "Loan Lookup", icon: "🔍",
    prompt: { type: "customer", text: "Ask the customer for their loan ID or customer ID before searching." } },
  { id: "status", label: "Application Status", icon: "📄",
    prompt: { type: "action", text: "Review the loan application status and timeline. Click the advance button to see the full record." } },
  { id: "delay", label: "Delay Reason", icon: "⏱️",
    prompt: { type: "action", text: "Note the reason for the delay. Then select the correct next action below." } },
  { id: "resolution", label: "Resolution Options", icon: "📋",
    prompt: { type: "action", text: "Review the processing policy. Select the appropriate resolution for this delay." } },
  { id: "apply", label: "Apply Actions", icon: "✅",
    prompt: { type: "action", text: "Confirm the action you will take. Add a case note, then click 'Confirm & Apply'." } },
  { id: "communicate", label: "Communicate to Customer", icon: "💬",
    prompt: { type: "customer", text: "Return to the customer tab and deliver the update below." } },
];

const REFUND_REQUEST_CUSTOMER = {
  name: "Morgan Riley",
  transactionId: "TXN-2024-05521",
  amount: "$340.00",
  date: "2026-03-25",
  merchant: "Unknown Merchant",
  phone: "(628) 555-0134",
  status: "FAILED – Pending Reversal",
};

// George Pan — synced with the refund_request + angry LLM persona
// ─── PORTAL PERSONA REGISTRY ──────────────────────────────────────────────────
// Single source of truth for scenario+persona specific portal data.
// Key format: "scenario:persona"
// Add a new entry here to support a new persona — no other code changes needed.
const PORTAL_PERSONAS = {
  "refund_request:angry": {
    name: "George Pan",
    firstName: "George",
    phone: "(628) 555-0198",
    transaction: {
      orderId: "59214",
      amount: "$349.99",
      date: "2026-03-25",
      product: "BaristaPro 350 Espresso Machine",
      merchant: "Home Appliances Direct",
      status: "FAILED – Pending Refund",
    },
    details: {
      type: "Credit Card Payment",
      failureCode: "DEFECTIVE_PRODUCT",
      merchantResponse: "Return request acknowledged",
      daysSince: "7 days",
      refundEligibility: "ELIGIBLE – Defective Item Return",
      estimatedReturn: "3–5 business days",
    },
  },
};

function buildCustomerFromPersona(p) {
  return {
    name: p.name,
    transactionId: `ORD-${p.transaction.orderId}`,
    amount: p.transaction.amount,
    date: p.transaction.date,
    merchant: p.transaction.merchant,
    phone: p.phone,
    status: p.transaction.status,
  };
}

function buildDetailsFromPersona(p) {
  return {
    ...p.details,
    processorRef: `ORD-${p.transaction.orderId}`,
  };
}

const REFUND_REQUEST_DETAILS = {
  type: "Debit Card Payment",
  processorRef: "PRO-88214",
  failureCode: "GATEWAY_TIMEOUT",
  merchantResponse: "Transaction not received",
  daysSince: "3 days",
  refundEligibility: "ELIGIBLE – Automatic Reversal",
  estimatedReturn: "1–3 business days",
};

const REFUND_REQUEST_POLICY = `FAILED TRANSACTION REFUND POLICY

Automatic Reversal Eligibility
  • Gateway timeout / failed authorizations:  ELIGIBLE ✓
  • Duplicate charges:                         ELIGIBLE ✓
  • Merchant disputes (no failure code):       Requires investigation

Processing Timelines
  ┌─────────────────────────────────────────────────────┐
  │  Automatic reversal:         1–3 business days       │
  │  Manual refund initiation:   3–5 business days       │
  │  Provisional credit:         Same day (if eligible)  │
  └─────────────────────────────────────────────────────┘

Provisional Credit
  • Available for transactions > $100 pending > 2 business days
  • Applied while investigation is in progress
  • Reversed if merchant confirms transaction was successful`;

const REFUND_REQUEST_STEPS = [
  { id: "lookup", label: "Transaction Lookup", icon: "🔍",
    prompt: { type: "customer", text: "Ask the customer for their transaction ID or the date and amount of the failed payment." } },
  { id: "details", label: "Payment Details", icon: "💳",
    prompt: { type: "action", text: "Review the transaction record and click the advance button to confirm the failure code." } },
  { id: "eligibility", label: "Refund Eligibility", icon: "🧾",
    prompt: { type: "action", text: "Check the failure code against eligibility rules. Confirm the refund type that applies." } },
  { id: "options", label: "Refund Options", icon: "📋",
    prompt: { type: "action", text: "Review the refund policy. Select the correct option for this transaction type." } },
  { id: "process", label: "Process Refund", icon: "✅",
    prompt: { type: "action", text: "Confirm the refund details. Add a case note, then click 'Initiate Refund'." } },
  { id: "communicate", label: "Communicate to Customer", icon: "💬",
    prompt: { type: "customer", text: "Return to the customer tab and deliver the update below." } },
];

// Screen-level content configs indexed by step (0–5)
const FIN_SCREEN_CONFIGS = {
  loan_delay: [
    // 0 – Loan Lookup
    { title: "Loan Application Search", placeholder: "Enter loan ID or customer ID...", searchLabel: "Search",
      wrongButtons: ["New Loan Application", "Close Application"],
      customer: LOAN_DELAY_CUSTOMER, advanceLabel: "Check Processing Status →" },
    // 1 – Application Status
    { title: "Application Status", data: LOAN_DELAY_STATUS, advanceLabel: "View Delay Details →",
      wrongButtons: ["Approve Immediately", "Transfer to Another Branch"] },
    // 2 – Delay Reason
    { title: "Delay Reason", statusBadge: "DELAYED", badgeGood: false,
      statusText: "Income verification documents are required. Customer must resubmit pay stubs or recent bank statements before underwriting can proceed.",
      action: "Request Documents", advanceLabel: "Request Documents →",
      wrongButtons: ["Deny Application", "Escalate to Legal"] },
    // 3 – Resolution Options
    { title: "Resolution Options", policy: LOAN_DELAY_POLICY,
      correctLabel: "✓ Request Income Documents + Set 5-Day Deadline",
      wrongButtons: ["Deny Application – Income Unverified", "Escalate to Risk Team", "Place on Hold Indefinitely"],
      correctMessage: "Correct. Request updated income documents and provide a 5-day resubmission deadline." },
    // 4 – Apply Actions
    { title: "Apply Actions",
      summary: [
        ["Customer", "Alex Chen"], ["Loan ID", "LN-2024-00892"],
        ["Action", "Document Request Issued"], ["Deadline", "5 business days from today"],
        ["Status", "Awaiting income verification resubmission"], ["Assigned", "Underwriting Team B"],
      ],
      wrongButtons: ["Escalate to Supervisor", "Cancel Application"],
      advanceLabel: "Confirm & Apply →",
      notePlaceholder: "e.g. Customer called re: loan delay. Income verification required. Document request sent with 5-day deadline. ETA 3–5 days post-submission." },
    // 5 – Communicate
    { title: "Case Updated — Communicate to Customer", customerName: "Alex",
      script: `"Alex, I've looked into your loan application. It's currently in our underwriting review stage, and the delay is due to an additional income verification step required for your loan amount — this is a standard part of the process, not a rejection.\n\nI've just sent a document request to your email. Once we receive your updated income documents, our team will aim to complete the review within 3 to 5 business days.\n\nIs there anything else I can help clarify for you today?"`,
      caseRef: "LOAN-2024-00892", caseStatus: "Open – Awaiting Documents",
      resolution: "Document request issued. 5-day deadline set. Customer informed of expected timeline." },
  ],
  refund_request: [
    // 0 – Transaction Lookup
    { title: "Transaction Search", placeholder: "Enter transaction ID or order ID...", searchLabel: "Search",
      wrongButtons: ["File Dispute Claim", "Block Card"],
      customer: REFUND_REQUEST_CUSTOMER, advanceLabel: "View Transaction Details →" },
    // 1 – Payment Details
    { title: "Payment Details", data: REFUND_REQUEST_DETAILS, advanceLabel: "Check Eligibility →",
      wrongButtons: ["Chargeback to Merchant", "Flag for Fraud Investigation"] },
    // 2 – Refund Eligibility
    { title: "Refund Eligibility Check", statusBadge: "ELIGIBLE", badgeGood: true,
      statusText: "Transaction failure code GATEWAY_TIMEOUT qualifies for automatic reversal. Merchant has confirmed the transaction was not received on their end.",
      action: "Check Eligibility", advanceLabel: "Check Eligibility →",
      wrongButtons: ["Deny Refund – Dispute Required", "Escalate to Fraud Team"] },
    // 3 – Refund Options
    { title: "Refund Options", policy: REFUND_REQUEST_POLICY,
      correctLabel: "✓ Automatic Reversal + Provisional Credit",
      wrongButtons: ["Manual Refund Only (3–5 days)", "Deny – Insufficient Evidence", "Escalate to Merchant Relations"],
      correctMessage: "Correct. Issue provisional credit today and initiate the automatic reversal process." },
    // 4 – Process Refund
    { title: "Process Refund",
      summary: [
        ["Customer", "Morgan Riley"], ["Transaction ID", "TXN-2024-05521"],
        ["Refund Amount", "$340.00"], ["Method", "Automatic Reversal + Provisional Credit"],
        ["Provisional Credit", "Applied today"], ["Full Reversal ETA", "1–3 business days"],
      ],
      wrongButtons: ["Issue Credit Only", "Escalate to Supervisor"],
      advanceLabel: "Initiate Refund →",
      notePlaceholder: "e.g. Customer called re: failed $340 transaction on 03/25. GATEWAY_TIMEOUT confirmed. Automatic reversal initiated. Provisional credit of $340 applied today." },
    // 5 – Communicate
    { title: "Case Resolved — Communicate to Customer", customerName: "Morgan",
      script: `"Morgan, I've reviewed your account and confirmed that the $340 transaction on March 25th failed on our end — the failure code shows a gateway timeout, which means the merchant never actually received the funds.\n\nI've initiated an automatic reversal, which will return the $340 to your account within 1 to 3 business days. I've also applied a provisional credit of $340 to your account effective today so you have access to those funds right away.\n\nIs there anything else I can help you with?"`,
      caseRef: "REFUND-2024-05521", caseStatus: "Closed",
      resolution: "Automatic reversal initiated. Provisional credit of $340 applied. Customer informed." },
  ],
};

// ─── GENERIC FINANCE SCREENS ─────────────────────────────────────────────────
function FinLookup({ config, onAdvance }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={config.placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && query.trim() && setFound(true)}
        />
        <ActionButton label={config.searchLabel} variant="primary" onClick={() => query.trim() && setFound(true)} />
      </div>
      <div className="flex gap-2">
        {config.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">Record Found</div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(config.customer).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                <span className={`font-medium ${k === "status" ? "text-red-600" : "text-gray-800"}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <ActionButton label={config.advanceLabel} variant="primary" onClick={onAdvance} />
          </div>
        </div>
      )}
    </div>
  );
}

function FinDetails({ config, onAdvance }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        {Object.entries(config.data).map(([k, v]) => (
          <div key={k}>
            <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton label={config.advanceLabel} variant="primary" onClick={onAdvance} />
        {config.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
    </div>
  );
}

function FinStatus({ config, onAdvance }) {
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <div className={`border rounded-xl p-4 text-sm space-y-2 ${config.badgeGood ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <div className={`flex items-center gap-2 font-bold text-base ${config.badgeGood ? "text-green-700" : "text-amber-700"}`}>
          <span>{config.badgeGood ? "✓" : "⚠"}</span> {config.statusBadge}
        </div>
        <p className={config.badgeGood ? "text-green-800" : "text-amber-800"}>{config.statusText}</p>
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2 flex-wrap">
        <ActionButton
          label={done ? `✓ ${config.action} Sent` : config.advanceLabel}
          variant={done ? "primary" : "default"}
          onClick={() => { setDone(true); setWrong(false); }}
        />
        {config.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
      {done && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Done. Proceed to review available options.</p>
          <ActionButton label="Review Options →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function FinPolicy({ config, onAdvance }) {
  const [decision, setDecision] = useState(null);
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <pre className="text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed">
        {config.policy}
      </pre>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Select what applies:</p>
        <div className="flex gap-2 flex-wrap">
          <ActionButton
            label={config.correctLabel}
            variant={decision === "correct" ? "primary" : "default"}
            onClick={() => { setDecision("correct"); setWrong(false); }}
          />
          {config.wrongButtons.map(label => (
            <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
          ))}
        </div>
        {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      </div>
      {decision === "correct" && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">{config.correctMessage}</p>
          <ActionButton label="Apply & Confirm →" variant="primary" onClick={onAdvance} />
        </div>
      )}
    </div>
  );
}

function FinApply({ config, onAdvance }) {
  const [note, setNote] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-2">
        {config.summary.map(([k, v]) => (
          <div key={k}><span className="text-gray-500">{k}:</span> <strong>{v}</strong></div>
        ))}
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Case Note (required)</label>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={config.notePlaceholder}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      <div className="flex gap-2">
        <ActionButton
          label={config.advanceLabel}
          variant="primary"
          onClick={() => note.trim() ? onAdvance() : setWrong(true)}
        />
        {config.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
      {!note.trim() && wrong && <p className="text-xs text-red-500">Please enter a case note before confirming.</p>}
    </div>
  );
}

function FinCommunicate({ config, onReset }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-600">↩ Switch to Chat tab — say this to {config.customerName}:</p>
        <p className="text-sm text-gray-800 leading-relaxed italic" style={{ whiteSpace: "pre-line" }}>{config.script}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Case Summary</p>
        <p>Case #: <strong>{config.caseRef}</strong> | Status: <span className={`font-semibold ${config.caseStatus === "Closed" ? "text-green-700" : "text-yellow-600"}`}>{config.caseStatus}</span></p>
        <p>Resolution: {config.resolution}</p>
      </div>
      <button onClick={onReset} className="text-sm text-blue-600 hover:underline">↺ Start New Case</button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function WorkflowPortal({ scenario, persona, step, completed, onAdvance, onReset, onGoToStep }) {
  const stepsMap = { vc1: VC1_STEPS, vc2: VC2_STEPS, vc3: VC3_STEPS, loan_delay: LOAN_DELAY_STEPS, refund_request: REFUND_REQUEST_STEPS };
  const steps = stepsMap[scenario] ?? VC2_STEPS;

  function advance() {
    onAdvance(steps[step].id);
  }

  const currentStepData = steps[step];

  const customerName = scenario === "loan_delay" && persona === "demanding" ? "Avery Collins" : "Alex Chen";
  const customerFirstName = customerName.split(" ")[0];

  const baseFinConfig = FIN_SCREEN_CONFIGS[scenario]?.[Math.min(step, 5)];
  let finConfig = baseFinConfig;
  if (scenario === "loan_delay" && baseFinConfig) {
    const stepIdx = Math.min(step, 5);
    if (stepIdx === 0) {
      finConfig = { ...baseFinConfig, customer: { ...baseFinConfig.customer, name: customerName } };
    } else if (stepIdx === 4) {
      finConfig = {
        ...baseFinConfig,
        summary: baseFinConfig.summary.map(([label, value]) =>
          label === "Customer" ? [label, customerName] : [label, value]
        ),
      };
    } else if (stepIdx === 5) {
      finConfig = {
        ...baseFinConfig,
        customerName: customerFirstName,
        script: baseFinConfig.script.replace(/\bAlex\b/g, customerFirstName),
      };
    }
  } else {
    const portalPersona = PORTAL_PERSONAS[`${scenario}:${persona}`];
    if (portalPersona && baseFinConfig) {
      const stepIdx = Math.min(step, 5);
      const customer = buildCustomerFromPersona(portalPersona);
      const details = buildDetailsFromPersona(portalPersona);
      const { firstName, transaction } = portalPersona;
      if (stepIdx === 0) {
        finConfig = { ...baseFinConfig, customer };
      } else if (stepIdx === 1) {
        finConfig = { ...baseFinConfig, data: details };
      } else if (stepIdx === 4) {
        finConfig = {
          ...baseFinConfig,
          summary: baseFinConfig.summary.map(([label, value]) => {
            if (label === "Customer") return [label, customer.name];
            if (label === "Transaction ID") return [label, customer.transactionId];
            if (label === "Refund Amount") return [label, customer.amount];
            return [label, value];
          }),
          notePlaceholder: `e.g. Customer called re: defective ${customer.transactionId}. ${transaction.product} — ${details.failureCode}. Full refund of ${customer.amount} initiated to original credit card. ETA ${details.estimatedReturn}.`,
        };
      } else if (stepIdx === 5) {
        finConfig = {
          ...baseFinConfig,
          customerName: firstName,
          script: `"${firstName}, I've reviewed your order and confirmed the return request for the ${transaction.product} — order ${customer.transactionId}. Based on the issue reported, you qualify for a full refund of ${customer.amount} to your original credit card.\n\nI've initiated the refund now. You should see ${customer.amount} returned to your card within ${details.estimatedReturn}.\n\nIs there anything else I can help you with today?"`,
          caseRef: `REFUND-${customer.transactionId}`,
          resolution: `Full refund of ${customer.amount} initiated to original credit card. Customer informed. ETA ${details.estimatedReturn}.`,
        };
      }
    }
  }

  const screenMap = {
    vc1: [VC1Lookup, VC1Bills, VC1Detail, VC1Policy, VC1Decision, VC1Communicate],
    vc2: [VC2Lookup, VC2Flight, VC2Rebook, VC2Policy, VC2Apply, VC2Communicate],
    vc3: [VC3Lookup, VC3Claim, VC3Trace, VC3Policy, VC3Apply, VC3Communicate],
    loan_delay: [FinLookup, FinDetails, FinStatus, FinPolicy, FinApply, FinCommunicate],
    refund_request: [FinLookup, FinDetails, FinStatus, FinPolicy, FinApply, FinCommunicate],
  };

  const Screen = (screenMap[scenario] ?? screenMap.vc2)[Math.min(step, 5)];

  return (
    <div className="h-full flex">
      <StepSidebar steps={steps} current={step} completed={completed} onGoToStep={onGoToStep} />
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-4">
          {currentStepData && <PromptBanner prompt={currentStepData.prompt} />}
          <Screen
            onAdvance={advance}
            onReset={onReset}
            config={finConfig}
          />
        </div>
      </div>
    </div>
  );
}
