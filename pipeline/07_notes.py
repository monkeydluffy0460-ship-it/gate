#!/usr/bin/env python3
"""Generate concise topic revision notes and insert them into Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq
from supabase import create_client

PIPELINE_DIR = Path(__file__).resolve().parent
INPUT_PATH = PIPELINE_DIR / "output" / "questions_uploaded.json"
OUTPUT_PATH = PIPELINE_DIR / "output" / "notes_generated.json"
CACHE_DIR = PIPELINE_DIR / "cache" / "notes"


def load_questions(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data if isinstance(data, list) else data.get("questions") if isinstance(data, dict) else None
    if not isinstance(questions, list) or not all(isinstance(item, dict) for item in questions):
        raise ValueError("Input must be an array or an object with a questions array")
    return questions


def generate_note(client: Groq, model: str, topic: str, questions: list[dict[str, Any]]) -> str:
    """Return the cached raw Groq response or request and cache it."""
    identity = hashlib.sha256(topic.encode("utf-8")).hexdigest()
    cache_path = CACHE_DIR / f"{identity}.txt"
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")

    examples = [
        {key: question.get(key) for key in ("question_text", "qtype", "options", "answer", "explanation", "year")}
        for question in questions[:100]
    ]
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Write concise, accurate GATE CS & IT revision notes in Markdown for the supplied topic. "
                    "Use headings for key concepts, formulas, problem-solving tricks, common mistakes, and "
                    "frequently tested areas. Ground the notes in the supplied questions; do not invent "
                    "specific exam-frequency statistics."
                ),
            },
            {"role": "user", "content": json.dumps({"topic": topic, "questions": examples}, ensure_ascii=False)},
        ],
    )
    raw = response.choices[0].message.content or ""
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of topics to generate notes for")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be non-negative")

    load_dotenv(PIPELINE_DIR / ".env")
    api_key, model = os.getenv("GROQ_API_KEY"), os.getenv("GROQ_MODEL")
    url, service_key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
    if not all((api_key, model, url, service_key)):
        print("GROQ_API_KEY, GROQ_MODEL, SUPABASE_URL, and SUPABASE_SERVICE_KEY are required in pipeline/.env", file=sys.stderr)
        return 1
    if not INPUT_PATH.is_file():
        print(f"Input file not found: {INPUT_PATH}", file=sys.stderr)
        return 1

    try:
        questions = load_questions(INPUT_PATH)
        topics = sorted({str(q["topic"]).strip() for q in questions if q.get("topic")})
        if args.limit is not None:
            topics = topics[:args.limit]
        groq_client = Groq(api_key=api_key)
        db = create_client(url, service_key)
        notes: list[dict[str, Any]] = []
        failures = 0
        for index, topic in enumerate(topics):
            related = [q for q in questions if str(q.get("topic", "")).strip() == topic]
            title = f"{topic} — GATE CS & IT revision notes"
            try:
                content = generate_note(groq_client, model, topic, related).strip()
                if not content:
                    raise ValueError("Groq returned empty notes")
                note = {"topic": topic, "title": title, "content": content, "is_ai": True}
                db.table("notes").insert(note).execute()
                notes.append(note)
            except Exception as error:
                failures += 1
                print(f"Warning: notes for {topic!r} failed: {error}", file=sys.stderr)
            if index < len(topics) - 1:
                time.sleep(2)

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps({"notes": notes}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Generated and inserted {len(notes)} topic notes; {failures} failed. Saved {OUTPUT_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
