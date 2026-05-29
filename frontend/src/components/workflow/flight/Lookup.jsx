import { useState } from "react";
import ActionButton from "../ActionButton";
import WrongAction from "../WrongAction";

export default function FlightLookup({ onAdvance, workflowData, updateData, workflow }) {
  const [wrong, setWrong] = useState(false);
  const [searched, setSearched] = useState(false);
  const { customer, screens } = workflow;
  const searchKeys = screens.lookup.searchKeys || [];

  const query = workflowData.searchQuery;
  const found = workflowData.applicationStatus;
  const notFound = workflowData.searchNotFound;

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    const match = searchKeys.some(k => k.trim().toUpperCase() === query.trim().toUpperCase());
    updateData("applicationStatus", match);
    updateData("searchNotFound", !match);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Passenger Lookup</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={screens.lookup.searchPlaceholder}
          value={query}
          onChange={e => {
            setSearched(false);
            updateData("searchQuery", e.target.value);
            updateData("searchNotFound", false);
            updateData("applicationStatus", false);
          }}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
        />
        <ActionButton label={screens.lookup.searchButtonLabel} variant="primary" onClick={handleSearch} />
      </div>
      <div className="flex gap-2">
        {screens.lookup.wrongButtons.map(label => (
          <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
        ))}
      </div>
      {wrong && <WrongAction onDismiss={() => setWrong(false)} />}
      {searched && notFound && !found && (
        <div className="border border-red-200 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          No record found for <strong>{query}</strong>. Check the booking reference and try again.
        </div>
      )}
      {found && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Passenger Record Found
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
            <ActionButton label={screens.lookup.advanceLabel} variant="primary" onClick={onAdvance} />
            {screens.lookup.foundWrongButtons.map(label => (
              <ActionButton key={label} label={label} onClick={() => setWrong(true)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
