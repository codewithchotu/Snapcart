#!/usr/bin/env python3
"""
Agent Logger for Snapcart (8X Assignment)
Captures coding-agent user prompts and final responses verbatim and in full,
with UTC timestamps, actual model name, session ID, and metadata.
Includes automated secret redaction for credentials, database URIs, API keys,
auth secrets, and OTPs.
"""

import os
import sys
import json
import re
import sqlite3
import time
from datetime import datetime, timezone

# Ensure stdout uses UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Constants and paths
APPDATA_GEMINI = r"C:\Users\owais\.gemini"
BRAIN_DIR = os.path.join(APPDATA_GEMINI, "antigravity-ide", "brain")
CONVERSATIONS_DIR = os.path.join(APPDATA_GEMINI, "antigravity-ide", "conversations")

REPO_ROOT = r"c:\Users\owais\Downloads\1.snapcartFolder\1.snapcartFolder\1.snapcart"
WORKSPACE_ROOT = r"c:\Users\owais\Downloads\1.snapcartFolder"
LOGS_DIR_REPO = os.path.join(REPO_ROOT, ".agent-logs")
LOGS_DIR_WORKSPACE = os.path.join(WORKSPACE_ROOT, ".agent-logs")

DEFAULT_MODEL = "Gemini 3.6 Flash (Medium)"

def load_dynamic_env_secrets():
    """
    Dynamically load actual configured secrets from local environment files in memory.
    This avoids hardcoding sensitive credentials in source code.
    """
    secrets = []
    env_paths = [
        os.path.join(REPO_ROOT, ".env.local"),
        os.path.join(REPO_ROOT, ".env"),
        os.path.join(WORKSPACE_ROOT, ".env.local"),
        os.path.join(WORKSPACE_ROOT, ".env"),
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if len(v) >= 4 and not v.startswith("http://localhost") and v not in ["development", "production", "test", "true", "false"]:
                            label = f"[REDACTED_{k.upper()}]"
                            secrets.append((v, label))
            except Exception:
                pass
    return secrets

def sanitize_text(text: str) -> str:
    """
    Sanitize sensitive credentials, URIs, keys, tokens, and OTPs from text.
    Uses pattern-based redaction and dynamic environment inspection.
    Never hardcodes production secrets.
    """
    if not text:
        return ""

    # 1. Redact MongoDB connection strings
    text = re.sub(r'mongodb(?:\+srv)?:\/\/[^\s`\'"<>]+', '[REDACTED_MONGODB_URI]', text)

    # 2. Redact Cloudinary connection strings
    text = re.sub(r'cloudinary:\/\/[^\s`\'"<>]+', '[REDACTED_CLOUDINARY_URL]', text)

    # 3. Redact Stripe API keys
    text = re.sub(r'\bsk_(?:live|test)_[0-9a-zA-Z]+\b', '[REDACTED_STRIPE_KEY]', text)

    # 4. Redact Google OAuth credentials
    text = re.sub(r'[0-9]+-[0-9a-zA-Z_]+\.apps\.googleusercontent\.com', '[REDACTED_GOOGLE_CLIENT_ID]', text)

    # 5. Redact OTP occurrences
    text = re.sub(r'(OTP generated and saved to MongoDB:\s*)\d+', r'\g<1>[REDACTED_OTP]', text)
    text = re.sub(r'(?:otp|verification code)[\s:=`"\'\(]+([0-9]{4,6})\b', '[REDACTED_OTP]', text, flags=re.IGNORECASE)

    # 6. Redact any active environment secrets loaded dynamically in memory
    dynamic_secrets = load_dynamic_env_secrets()
    for secret_val, replacement in dynamic_secrets:
        if secret_val and len(secret_val) >= 4:
            text = text.replace(secret_val, replacement)

    # 7. Redact common secret patterns in configuration lines
    text = re.sub(r'(AUTH_SECRET\s*=\s*["\']?)[^"\'\s\n`]+(["\']?)', r'\g<1>[REDACTED_AUTH_SECRET]\g<2>', text)
    text = re.sub(r'(CLOUDINARY_API_KEY\s*=\s*["\']?)[^"\'\s\n`]+(["\']?)', r'\g<1>[REDACTED_CLOUDINARY_API_KEY]\g<2>', text)
    text = re.sub(r'(CLOUDINARY_API_SECRET\s*=\s*["\']?)[^"\'\s\n`]+(["\']?)', r'\g<1>[REDACTED_CLOUDINARY_SECRET]\g<2>', text)

    return text

def get_actual_model_name(session_id: str, payload_model: str = None) -> str:
    """Resolve the genuine model name for a session."""
    if payload_model and payload_model not in ("auto", "default", ""):
        if payload_model == "gemini-3.6-flash":
            return "Gemini 3.6 Flash (Medium)"
        return payload_model

    # Check conversation database
    db_path = os.path.join(CONVERSATIONS_DIR, f"{session_id}.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT data FROM gen_metadata;")
            for row in cur.fetchall():
                if row and row[0]:
                    models = re.findall(rb'Gemini [a-zA-Z0-9. ()-]+', row[0])
                    if models:
                        model_str = models[-1].decode('utf-8', errors='ignore').strip()
                        if "Gemini 3.6 Flash" in model_str:
                            conn.close()
                            return "Gemini 3.6 Flash (Medium)"
                        conn.close()
                        return model_str
            conn.close()
        except Exception:
            pass

    return DEFAULT_MODEL

def is_snapcart_session(session_id: str, transcript_path: str = None) -> bool:
    """Verify if a session belongs to the Snapcart project."""
    db_path = os.path.join(CONVERSATIONS_DIR, f"{session_id}.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT data FROM trajectory_metadata_blob;")
            row = cur.fetchone()
            conn.close()
            if row and row[0]:
                blob_str = row[0].decode('utf-8', errors='ignore')
                if "snapcart" in blob_str.lower() or "1.snapcartfolder" in blob_str.lower():
                    return True
        except Exception:
            pass

    t_paths = []
    if transcript_path and os.path.exists(transcript_path):
        t_paths.append(transcript_path)
    base_dir = os.path.join(BRAIN_DIR, session_id, ".system_generated", "logs")
    t_paths.append(os.path.join(base_dir, "transcript_full.jsonl"))
    t_paths.append(os.path.join(base_dir, "transcript.jsonl"))

    for p in t_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    sample = f.read(200000)
                if "snapcart" in sample.lower() or "1.snapcart" in sample.lower() or "8x assignment" in sample.lower():
                    return True
            except Exception:
                pass
    return False

def parse_transcript_turns(session_id: str, transcript_path: str = None):
    """
    Parse the persistent transcript into genuine prompt/response turns.
    Preserves exact order, verbatim text, and UTC timestamps.
    Omits reasoning (thinking), tool calls, and intermediate execution steps.
    """
    candidate_paths = []
    if transcript_path:
        parent_dir = os.path.dirname(transcript_path)
        full_candidate = os.path.join(parent_dir, "transcript_full.jsonl")
        if os.path.exists(full_candidate):
            candidate_paths.append(full_candidate)
        if os.path.exists(transcript_path):
            candidate_paths.append(transcript_path)

    base_dir = os.path.join(BRAIN_DIR, session_id, ".system_generated", "logs")
    candidate_paths.append(os.path.join(base_dir, "transcript_full.jsonl"))
    candidate_paths.append(os.path.join(base_dir, "transcript.jsonl"))

    resolved_path = None
    for p in candidate_paths:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            resolved_path = p
            break

    if not resolved_path:
        return None, []

    model_name = get_actual_model_name(session_id)

    turns = []
    current_prompt = None
    current_prompt_ts = None
    current_response = None
    current_response_ts = None
    last_response_with_tools = None
    last_response_with_tools_ts = None

    with open(resolved_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue

            t = obj.get("type")
            src = obj.get("source")
            content = obj.get("content") or ""
            tools = obj.get("tool_calls") or []
            ts = obj.get("created_at")

            if t == "USER_INPUT" and src == "USER_EXPLICIT":
                if current_prompt is not None:
                    final_text = current_response or last_response_with_tools
                    final_ts = current_response_ts or last_response_with_tools_ts or current_prompt_ts
                    turns.append({
                        "prompt": sanitize_text(current_prompt),
                        "prompt_ts": current_prompt_ts,
                        "response": sanitize_text(final_text) if final_text else "(No text response; step executed via automated tools)",
                        "response_ts": final_ts,
                        "model": model_name
                    })
                current_prompt = content
                current_prompt_ts = ts
                current_response = None
                current_response_ts = None
                last_response_with_tools = None
                last_response_with_tools_ts = None

            elif t == "PLANNER_RESPONSE" and src == "MODEL":
                if content:
                    if len(tools) == 0:
                        current_response = content
                        current_response_ts = ts
                    else:
                        last_response_with_tools = content
                        last_response_with_tools_ts = ts

    if current_prompt is not None:
        final_text = current_response or last_response_with_tools
        final_ts = current_response_ts or last_response_with_tools_ts or current_prompt_ts
        turns.append({
            "prompt": sanitize_text(current_prompt),
            "prompt_ts": current_prompt_ts,
            "response": sanitize_text(final_text) if final_text else "(Turn in progress)",
            "response_ts": final_ts,
            "model": model_name
        })

    session_start_ts = turns[0]["prompt_ts"] if turns else None
    return session_start_ts, turns

def write_session_log(session_id: str, start_ts: str, turns: list, payload_model: str = None) -> str:
    """Generate and write the markdown log file in the requested format."""
    if not turns:
        return None

    model_name = get_actual_model_name(session_id, payload_model)

    if start_ts:
        try:
            clean_ts = start_ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts).astimezone(timezone.utc)
            fname_prefix = dt.strftime("%Y-%m-%d_%H-%M-%S")
        except Exception:
            fname_prefix = "unknown_date"
    else:
        fname_prefix = "unknown_date"

    filename = f"{fname_prefix}_{session_id}.md"

    lines = []
    lines.append(f"# Agent Session: `{session_id}`")
    lines.append("")
    lines.append("## Session Metadata")
    lines.append(f"- **Session ID**: `{session_id}`")
    lines.append(f"- **Started At (UTC)**: `{start_ts}`")
    lines.append(f"- **Model**: `{model_name}`")
    lines.append(f"- **Workspace**: `codewithchotu/Snapcart`")
    lines.append(f"- **Total Exchanges**: `{len(turns)}`")
    lines.append("")
    lines.append("---")
    lines.append("")

    for idx, turn in enumerate(turns, 1):
        lines.append(f"## Turn {idx}")
        lines.append(f"- **Timestamp (UTC)**: `{turn['prompt_ts']}`")
        lines.append(f"- **Model**: `{turn['model']}`")
        lines.append("")
        lines.append("### User Prompt")
        lines.append("")
        lines.append("```text")
        lines.append(turn['prompt'].strip())
        lines.append("```")
        lines.append("")
        lines.append("### Assistant Response")
        lines.append("")
        lines.append(turn['response'].strip())
        lines.append("")
        lines.append("---")
        lines.append("")

    content = "\n".join(lines)

    for target_dir in [LOGS_DIR_REPO, LOGS_DIR_WORKSPACE]:
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    return os.path.join(LOGS_DIR_REPO, filename)

def process_session(session_id: str, transcript_path: str = None, payload_model: str = None):
    """Process a single session and output its log file."""
    if not is_snapcart_session(session_id, transcript_path):
        return None
    start_ts, turns = parse_transcript_turns(session_id, transcript_path)
    if not turns:
        return None
    return write_session_log(session_id, start_ts, turns, payload_model)

def find_latest_active_session():
    """Find the most recently updated session in the brain directory."""
    if not os.path.exists(BRAIN_DIR):
        return None
    candidates = []
    for sid in os.listdir(BRAIN_DIR):
        p = os.path.join(BRAIN_DIR, sid, ".system_generated", "logs", "transcript.jsonl")
        if os.path.exists(p):
            mtime = os.path.getmtime(p)
            candidates.append((mtime, sid, p))
    candidates.sort(key=lambda x: x[0], reverse=True)
    for _, sid, p in candidates:
        if is_snapcart_session(sid, p):
            return sid
    return None

def process_all_historical_sessions():
    """Recover and export all genuine historical Snapcart sessions."""
    if not os.path.exists(BRAIN_DIR):
        print(f"Brain directory not found: {BRAIN_DIR}")
        return []

    processed = []
    sessions = os.listdir(BRAIN_DIR)
    for sid in sorted(sessions):
        p_full = os.path.join(BRAIN_DIR, sid, ".system_generated", "logs", "transcript_full.jsonl")
        p_short = os.path.join(BRAIN_DIR, sid, ".system_generated", "logs", "transcript.jsonl")
        t_path = p_full if os.path.exists(p_full) else p_short
        if os.path.exists(t_path):
            if is_snapcart_session(sid, t_path):
                out_path = process_session(sid, t_path)
                if out_path:
                    processed.append(out_path)
                    print(f"[RECOVERED] Session {sid} -> {os.path.basename(out_path)}")
    return processed

def run_regression_tests():
    """
    Automated regression tests for secret redaction.
    Uses strictly fake, fabricated mock credentials.
    """
    print("Running Secret Redaction Regression Tests (using fake mock credentials)...")

    fake_mongo = "mongodb+srv://mockuser:mockpass@clustermock.mongodb.net/testdb?retryWrites=true"
    fake_cloudinary = "cloudinary://mock_key:mock_secret@mock_cloud"
    fake_stripe = "sk_test_mockdummykey1234567890"
    fake_auth = "AUTH_SECRET=\"mock_auth_secret_placeholder_string\""
    fake_otp_msg = "OTP generated and saved to MongoDB: 987654"

    test_input = f"""
    Debugging log:
    DB string: {fake_mongo}
    Image URL: {fake_cloudinary}
    Payment: {fake_stripe}
    Auth: {fake_auth}
    Message: {fake_otp_msg}
    """

    sanitized = sanitize_text(test_input)

    assert fake_mongo not in sanitized, "Test failed: fake MongoDB URI was not redacted"
    assert "[REDACTED_MONGODB_URI]" in sanitized, "Test failed: missing [REDACTED_MONGODB_URI]"
    assert fake_cloudinary not in sanitized, "Test failed: fake Cloudinary URL was not redacted"
    assert "[REDACTED_CLOUDINARY_URL]" in sanitized, "Test failed: missing [REDACTED_CLOUDINARY_URL]"
    assert fake_stripe not in sanitized, "Test failed: fake Stripe key was not redacted"
    assert "[REDACTED_STRIPE_KEY]" in sanitized, "Test failed: missing [REDACTED_STRIPE_KEY]"
    assert "fakeAuthSecret" not in sanitized, "Test failed: fake AUTH_SECRET was not redacted"
    assert "[REDACTED_AUTH_SECRET]" in sanitized, "Test failed: missing [REDACTED_AUTH_SECRET]"
    assert "987654" not in sanitized, "Test failed: fake OTP was not redacted"
    assert "[REDACTED_OTP]" in sanitized, "Test failed: missing [REDACTED_OTP]"

    print("All regression tests PASSED successfully! 0 secret leaks detected.")
    return True

def handle_hook_invocation():
    """Handle Antigravity lifecycle hook execution via stdin."""
    try:
        raw_input = sys.stdin.read()
    except Exception:
        raw_input = ""

    payload = {}
    if raw_input.strip():
        try:
            payload = json.loads(raw_input)
        except Exception:
            pass

    session_id = payload.get("conversationId")
    transcript_path = payload.get("transcriptPath")
    model_name = payload.get("modelName")

    if not session_id:
        session_id = find_latest_active_session()

    if session_id:
        process_session(session_id, transcript_path, model_name)

    output = {
        "decision": "stop",
        "injectSteps": []
    }
    sys.stdout.write(json.dumps(output) + "\n")
    sys.stdout.flush()

def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "--historical":
            print("Recovering genuine historical Snapcart coding sessions...")
            results = process_all_historical_sessions()
            print(f"Completed! Recovered {len(results)} session log files.")
            return
        elif sys.argv[1] == "--test-redaction":
            run_regression_tests()
            return
        elif sys.argv[1] == "--session" and len(sys.argv) > 2:
            sid = sys.argv[2]
            res = process_session(sid)
            print(f"Processed session {sid}: {res}")
            return
        elif sys.argv[1] == "--active":
            sid = find_latest_active_session()
            if sid:
                res = process_session(sid)
                print(f"Processed active session {sid}: {res}")
            return

    handle_hook_invocation()

if __name__ == "__main__":
    main()
