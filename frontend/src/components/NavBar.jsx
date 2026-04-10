export default function NavBar({ displayName, onProfile, onLogout }) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onProfile}
        className="text-sm text-gray-600 hover:text-blue-600 font-medium transition"
      >
        {displayName}
      </button>
      <button
        onClick={onLogout}
        className="text-sm text-gray-400 hover:text-gray-700 transition"
      >
        Sign out
      </button>
    </div>
  );
}
