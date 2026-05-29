import { useState } from "react";
import ActionButton from "../ActionButton";
import WrongAction from "../WrongAction";

export default function LoanLookup({ workflow, onAdvance, workflowData, updateData }) {
  const [wrong, setWrong] = useState(false);
  const cfg = workflow.screenConfigs[0];
  const customer = cfg.customer;
  const searchKeys = cfg.searchKeys || [];

  const query = workflowData.loanSearch;
  const found = workflowData.applicationStatus;
  const notFound = workflowData.searchNotFound;

  // DEBUG — remove after diagnosis
  console.log("[LoanLookup render] FOUND BEFORE:", workflowData.applicationStatus, "| SEARCH KEYS:", searchKeys);

  const handleSearch = () => {
    if (!query.trim()) return;
    const match = searchKeys.some(k => k.trim().toUpperCase() === query.trim().toUpperCase());
    console.log("[LoanLookup search] QUERY:", query);
    console.log("[LoanLookup search] SEARCH KEYS:", searchKeys);
    console.log("[LoanLookup search] MATCH:", match);
    console.log("[LoanLookup search] FOUND BEFORE:", workflowData.applicationStatus);
    updateData("applicationStatus", match);
    updateData("searchNotFound", !match);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">{cfg.title}</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={cfg.placeholder}
          value={query}
          onChange={e => updateData("loanSearch", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
        />
        <ActionButton label={cfg.searchLabel} variant="primary" onClick={handleSearch} />
      </div>
      <div className="flex gap-2">
        {cfg.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {notFound && !found && (
        <div className="border border-red-200 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          No record found for <strong>{query}</strong>. Check the loan ID and try again.
        </div>
      )}
      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Record Found
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {Object.entries(customer).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                <span className={`font-medium ${k === "status" ? "text-red-600" : "text-gray-800"}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <ActionButton label={cfg.advanceLabel} variant="primary" onClick={onAdvance} />
          </div>
        </div>
      )}
    </div>
  );
}
