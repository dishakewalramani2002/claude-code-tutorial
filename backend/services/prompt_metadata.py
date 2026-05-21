import os
import json
import re

_SCENARIOS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts", "scenarios")


def _find_portal_block(text: str):
    """Return (marker_pos, json_start, json_end) indices, or None if no PORTAL_DATA block found."""
    marker_pos = text.find("PORTAL_DATA")
    if marker_pos == -1:
        return None

    json_start = text.find("{", marker_pos + len("PORTAL_DATA"))
    if json_start == -1:
        return None

    depth = 0
    for i in range(json_start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return (marker_pos, json_start, i)
    return None


def extract_portal_data(scenario: str) -> dict:
    """Parse the PORTAL_DATA JSON block from a scenario prompt file.

    Returns an empty dict if the file is missing or contains no PORTAL_DATA block.
    Silently ignores malformed JSON so a bad block never breaks the workflow endpoint.
    """
    path = os.path.join(_SCENARIOS_DIR, f"{scenario}.txt")
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return {}

    bounds = _find_portal_block(content)
    if not bounds:
        return {}

    _, json_start, json_end = bounds
    try:
        return json.loads(content[json_start : json_end + 1])
    except (json.JSONDecodeError, ValueError):
        return {}


def strip_portal_data(text: str) -> str:
    """Remove the PORTAL_DATA block (and its trailing --- separator) from a prompt string.

    Called by llm_service before assembling the system prompt so the LLM only sees
    the narrative content, not the raw metadata JSON.
    """
    bounds = _find_portal_block(text)
    if not bounds:
        return text

    marker_pos, _, json_end = bounds
    before = text[:marker_pos].rstrip()
    after = text[json_end + 1:]
    # Strip optional --- separator and surrounding blank lines
    after = re.sub(r"^\s*-{3,}\s*", "", after)

    if before:
        return (before + "\n\n" + after.lstrip()).strip()
    return after.lstrip().strip()


def inject_metadata(data, metadata: dict):
    """Recursively replace {{key}} placeholders throughout a parsed JSON structure.

    Unrecognised placeholders are left intact so missing keys produce visible markers
    rather than silent empty strings.
    """
    if isinstance(data, str):
        def _replace(m):
            key = m.group(1)
            return str(metadata[key]) if key in metadata else m.group(0)
        return re.sub(r"\{\{(\w+)\}\}", _replace, data)
    if isinstance(data, dict):
        return {k: inject_metadata(v, metadata) for k, v in data.items()}
    if isinstance(data, list):
        return [inject_metadata(item, metadata) for item in data]
    return data
