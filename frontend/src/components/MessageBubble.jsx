function safeContent(content) {
  if (typeof content !== "string") return String(content ?? "");
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.customer_response) return parsed.customer_response;
    } catch (_) {}
  }
  return content;
}

export default function MessageBubble({ role, content, hasFeedback, isSelected, onClick }) {
  const isUser = role === "user";
  const displayContent = isUser ? content : safeContent(content);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        onClick={onClick}
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? `text-white rounded-br-sm ${isSelected ? "bg-blue-800 ring-2 ring-blue-300" : "bg-blue-600"}
               ${hasFeedback ? "cursor-pointer hover:bg-blue-700" : ""}`
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
          }`}
      >
        {!isUser && (
          <span className="block text-xs font-semibold text-gray-400 mb-1">Customer</span>
        )}
        {displayContent}
        {isUser && hasFeedback && (
          <span className="block text-xs mt-1 opacity-60">
            {isSelected ? "▲ feedback shown" : "▼ click for feedback"}
          </span>
        )}
      </div>
    </div>
  );
}
