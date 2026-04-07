import { useState } from "react";

// ─── DOMAIN / SCENARIO CONFIG ─────────────────────────────────────────────────
const DOMAINS = [
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    available: true,
    scenarios: [
      {
        id: "vc2",
        label: "Flight Cancellation",
        description: "Handle a passenger whose flight was cancelled due to weather. Navigate rebooking options and compensation policy.",
      },
      {
        id: "vc3",
        label: "Lost Baggage",
        description: "Assist a passenger whose checked bag has been missing for two days. Trace the bag and arrange interim expenses.",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "💰",
    available: true,
    scenarios: [
      {
        id: "loan_delay",
        label: "Loan Delay",
        description: "Assist a customer whose loan approval or disbursement has been delayed. Handle frustration and provide clear next steps.",
      },
      {
        id: "refund_request",
        label: "Refund Request",
        description: "Help a customer requesting a refund for a failed or incorrect financial transaction. Address urgency and set expectations.",
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: "🛠️",
    available: false,
    scenarios: [],
    comingSoon: true,
  },
];

// Health Insurance is kept as a standalone entry under a separate domain
const HEALTHCARE_DOMAIN = {
  id: "healthcare",
  label: "Healthcare",
  icon: "🏥",
  available: true,
  scenarios: [
    {
      id: "vc1",
      label: "Health Insurance Billing",
      description: "Handle a member disputing a surprise $1,200 medical bill they were told would be covered.",
    },
  ],
};

const ALL_DOMAINS = [HEALTHCARE_DOMAIN, ...DOMAINS];

const PERSONAS = [
  {
    id: "angry",
    label: "Angry",
    emoji: "😡",
    description: "Intensely frustrated, may be curt or accusatory. Calms down with genuine help.",
  },
  {
    id: "confused",
    label: "Confused",
    emoji: "😕",
    description: "Overwhelmed, asks many questions, needs simple clear explanations.",
  },
  {
    id: "demanding",
    label: "Demanding",
    emoji: "😤",
    description: "Calm but firm. Knows what they want and pushes hard for it.",
  },
  {
    id: "anxious",
    label: "Anxious",
    emoji: "😰",
    description: "Worried and prone to catastrophizing. Needs reassurance and calm guidance.",
  },
];

// Avery Collins — detailed persona for loan_delay + demanding
export const AVERY_COLLINS_PERSONA = {
  name: "Avery Collins",
  ageGroup: "28-40",
  communicationStyle: "Demanding, sharp, impatient, presses for immediate answers",
  domain: "Finance and Banking",
  scenario: "loan_delay",
  issue: "Customer has not received the loan funds and is frustrated by vague updates and lack of clear timeline",
  primaryEmotion: "demanding",
  emotionalIntensity: "high",
  hiddenBackground: [
    "The customer is relying on this loan to complete a major payment (e.g., housing deposit / urgent bill)",
    "Missing the deadline may result in financial penalties or losing an important opportunity",
    "They have already been told an earlier approval date that was not met",
    "They feel a loss of control over their financial situation",
    "They will NOT explicitly say they are anxious, but this anxiety drives their urgency and pressure",
  ],
  interactionContext: [
    "This is a live customer support phone call",
    "The customer expects a clear answer, not general process explanations",
    "The customer starts with demands and complaints, not full context",
    "Information is only revealed when the CSR asks precise, relevant follow-up questions",
  ],
  targetSkill: "Empathy and Emotional Acknowledgement",
  behaviorRules: {
    baseline: [
      "Responses should be within four lines",
      "Starts conversation in a demanding and pressured tone",
      "Repeatedly asks for a clear timeline or confirmation",
      "Rejects vague answers like 'it's being processed' or 'soon'",
      "DO NOT use meta phrases such as: 'I'd start by…', 'let me explain…', 'since you asked…', 'what I would do is…', 'first/second/third…'",
      "Speak like a real person under financial stress, not like giving structured advice",
    ],
    escalationBehavior: [
      "If CSR does NOT provide exact, concrete information: repeats demands more aggressively, questions competence of the bank",
      "Uses pressure statements: 'This should not be this hard' / 'Why is nobody giving me a straight answer?'",
      "If still unresolved: threatens escalation (supervisor, complaint, switching banks)",
      "Uses conditional escalation: 'If this isn't resolved today, I'm filing a complaint' / 'If I don't get a real answer, I'm taking this elsewhere'",
    ],
  },
  deescalationTriggers: [
    "CSR provides exact loan status with identifier",
    "CSR provides specific reason for delay (not generic)",
    "CSR provides exact completion timeline (specific date/time)",
    "CSR provides clear next step + ownership",
    "CSR shows empathy BEFORE giving information — ALL above elements must be present and specific; if ANY part is vague or missing, do NOT de-escalate",
  ],
  deescalationBehavior: [
    "Tone softens gradually ONLY after all conditions are met",
    "Stops repeating demands, becomes more cooperative",
    "May ask clarifying questions",
    "Remains cautious, not overly friendly",
  ],
};

// Scenario-specific persona description overrides — shown in the persona selector UI
// when a particular scenario + persona combination has a distinct character
const SCENARIO_PERSONA_OVERRIDES = {
  loan_delay: {
    demanding: `${AVERY_COLLINS_PERSONA.name} — sharp and impatient about a delayed loan approval. Escalates aggressively if given vague answers. Only de-escalates when given exact status, reason, timeline, and ownership — with empathy first.`,
  },
};

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────
function StepHeader({ step, total, label }) {
  return (
    <div className="mb-8 text-center">
      <p className="text-sm text-gray-400 font-medium mb-1">Step {step} of {total}</p>
      <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition"
    >
      ← Back
    </button>
  );
}

// Step 1: Choose Domain
function StepDomain({ onSelect }) {
  return (
    <div>
      <StepHeader step={1} total={4} label="Choose a Domain" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {ALL_DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => d.available && onSelect(d)}
            disabled={!d.available}
            className={`border rounded-xl p-5 text-left transition space-y-2 ${
              d.available
                ? "bg-white border-gray-200 hover:shadow-md hover:border-blue-400 cursor-pointer"
                : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{d.icon}</span>
              {d.comingSoon && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-gray-800">{d.label}</p>
            {d.available && (
              <p className="text-xs text-gray-500">{d.scenarios.length} scenario{d.scenarios.length !== 1 ? "s" : ""} available</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 2: Choose Scenario
function StepScenario({ domain, onSelect, onBack }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <StepHeader step={2} total={4} label={`Choose a Scenario — ${domain.label}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {domain.scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:shadow-md hover:border-blue-400 transition space-y-2"
          >
            <p className="text-base font-semibold text-gray-800">{s.label}</p>
            <p className="text-sm text-gray-500">{s.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 3: Choose Persona
function StepPersona({ onSelect, onBack, scenario }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <StepHeader step={3} total={4} label="Choose a Customer Persona" />
      <p className="text-center text-sm text-gray-500 mb-6 -mt-4">
        This sets the emotional style of the virtual customer you will interact with.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {PERSONAS.map((p) => {
          const overrideDescription = scenario && SCENARIO_PERSONA_OVERRIDES[scenario.id]?.[p.id];
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md hover:border-blue-400 transition space-y-2"
            >
              <span className="text-3xl block">{p.emoji}</span>
              <p className="text-sm font-semibold text-gray-800">{p.label}</p>
              <p className="text-xs text-gray-500 leading-snug">{overrideDescription ?? p.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 4: Choose Mode
function StepMode({ scenario, persona, onSelect, onBack }) {
  const modes = [
    {
      id: "training",
      label: "Training Mode",
      badge: "Feedback Enabled",
      badgeColor: "bg-green-100 text-green-800",
      description:
        "Receive live coaching feedback on empathy, transparency, and ownership after each of your responses. Best for skill building.",
    },
    {
      id: "evaluation",
      label: "Evaluation Mode",
      badge: "No Feedback",
      badgeColor: "bg-yellow-100 text-yellow-800",
      description:
        "Handle the scenario without coaching. Your responses are assessed only at the end. Best for testing your readiness.",
    },
  ];

  return (
    <div>
      <BackButton onClick={onBack} />
      <StepHeader step={4} total={4} label="Choose a Mode" />
      <p className="text-center text-sm text-gray-500 mb-6 -mt-4">
        Scenario: <strong>{scenario.label}</strong> &nbsp;·&nbsp; Persona: <strong>{persona.emoji} {persona.label}</strong>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:shadow-md hover:border-blue-400 transition space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-800">{m.label}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.badgeColor}`}>
                {m.badge}
              </span>
            </div>
            <p className="text-sm text-gray-500">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ModeSelector({ onSelect }) {
  const [step, setStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);

  function handleDomainSelect(domain) {
    setSelectedDomain(domain);
    // If only one scenario, skip the scenario step
    if (domain.scenarios.length === 1) {
      setSelectedScenario(domain.scenarios[0]);
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleScenarioSelect(scenario) {
    setSelectedScenario(scenario);
    setStep(3);
  }

  function handlePersonaSelect(persona) {
    setSelectedPersona(persona);
    setStep(4);
  }

  function handleModeSelect(modeId) {
    onSelect({
      scenario: selectedScenario.id,
      persona: selectedPersona.id,
      training: modeId === "training",
      // labels for display
      scenarioLabel: selectedScenario.label,
      personaLabel: selectedPersona.label,
      personaEmoji: selectedPersona.emoji,
    });
  }

  function handleBack() {
    if (step === 2) { setStep(1); setSelectedDomain(null); }
    else if (step === 3) {
      // If domain had only one scenario, we skipped step 2 — go back to step 1
      if (selectedDomain.scenarios.length === 1) { setStep(1); setSelectedDomain(null); setSelectedScenario(null); }
      else { setStep(2); setSelectedScenario(null); }
    }
    else if (step === 4) { setStep(3); setSelectedPersona(null); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {step === 1 && <StepDomain onSelect={handleDomainSelect} />}
        {step === 2 && selectedDomain && (
          <StepScenario domain={selectedDomain} onSelect={handleScenarioSelect} onBack={handleBack} />
        )}
        {step === 3 && (
          <StepPersona onSelect={handlePersonaSelect} onBack={handleBack} scenario={selectedScenario} />
        )}
        {step === 4 && selectedScenario && selectedPersona && (
          <StepMode
            scenario={selectedScenario}
            persona={selectedPersona}
            onSelect={handleModeSelect}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
