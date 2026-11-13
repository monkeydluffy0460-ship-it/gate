#!/usr/bin/env python3
"""Generate GATE-style practice questions from the previous notes stage."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq
from supabase import create_client

PIPELINE_DIR = Path(__file__).resolve().parent
INPUT_PATH = PIPELINE_DIR / "output" / "notes_generated.json"
OUTPUT_PATH = PIPELINE_DIR / "output" / "questions_generated.json"
CACHE_DIR = PIPELINE_DIR / "cache" / "generate"
VALID_TYPES = {"MCQ", "MSQ", "NAT"}


def load_topics(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    notes = data.get("notes") if isinstance(data, dict) else None
    if not isinstance(notes, list):
        raise ValueError("notes_generated.json must contain a 'notes' array")
    return sorted({str(note["topic"]).strip() for note in notes if isinstance(note, dict) and note.get("topic")})


def cached_generation(client: Groq, model: str, topic: str, count: int) -> str:
    identity = hashlib.sha256(f"{topic}:{count}".encode("utf-8")).hexdigest()
    cache_path = CACHE_DIR / f"{identity}.txt"
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Create original GATE CS & IT practice questions based on the topic. Return only a JSON array. "
                    "Each item must have qtype (MCQ, MSQ, or NAT), marks (1 or 2), question_text, options "
                    "(array of {label,value,text} for MCQ/MSQ and [] for NAT), answer, nat_min, nat_max, and "
                    "explanation. MCQ/MSQ answers are option letters (semicolon-separated for MSQ). NAT answers "
                    "are numeric strings with numeric tolerance bounds. Questions must be unambiguous and include "
                    "a correct concise explanation."
                ),
            },
            {"role": "user", "content": json.dumps({"topic": topic, "count": count}, ensure_ascii=False)},
        ],
    )
    raw = response.choices[0].message.content or ""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


def parse_questions(raw: str, topic: str) -> list[dict[str, Any]]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            raise ValueError("Groq response did not contain a JSON array")
        parsed = json.loads(match.group(0))
    if not isinstance(parsed, list):
        raise ValueError("Groq response must be a JSON array")

    valid: list[dict[str, Any]] = []
    for index, item in enumerate(parsed):
        if not isinstance(item, dict) or item.get("qtype") not in VALID_TYPES:
            raise ValueError(f"Generated item {index + 1} has an invalid question type")
        if not item.get("question_text") or not item.get("answer") or not item.get("explanation"):
            raise ValueError(f"Generated item {index + 1} is missing question, answer, or explanation")
        item["topic"] = topic
        item["subtopic"] = str(item.get("subtopic") or "AI Practice")
        item["section"] = str(item.get("section") or "Practice")
        item["marks"] = int(item.get("marks") or 1)
        if item["marks"] not in (1, 2):
            raise ValueError(f"Generated item {index + 1} must be worth 1 or 2 marks")
        item["options"] = item.get("options") if item["qtype"] != "NAT" else []
        item["is_generated"] = True
        item["answer_source"] = "ai_unsure"
        item["year"] = None
        item["paper_set"] = "AI Practice"
        identity = "\x1f".join((topic, str(item["qtype"]), str(item["question_text"])))
        item["text_hash"] = hashlib.sha256(identity.encode("utf-8")).hexdigest()
        valid.append(item)
    return valid


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=5, help="Questions to request per topic (default: 5)")
    parser.add_argument("--limit", type=int, help="Maximum total questions to insert")
    args = parser.parse_args()
    if args.count < 1 or (args.limit is not None and args.limit < 0):
        parser.error("--count must be positive and --limit must be non-negative")

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
        topics = load_topics(INPUT_PATH)
        groq_client = Groq(api_key=api_key)
        db = create_client(url, service_key)
        generated: list[dict[str, Any]] = []
        failures = 0
        for index, topic in enumerate(topics):
            try:
                generated.extend(parse_questions(cached_generation(groq_client, model, topic, args.count), topic))
            except Exception as error:
                failures += 1
                print(f"Warning: generation for {topic!r} failed: {error}", file=sys.stderr)
            if index < len(topics) - 1:
                time.sleep(2)

        if args.limit is not None:
            generated = generated[:args.limit]
        if generated:
            db.table("questions").upsert(generated, on_conflict="text_hash").execute()
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps({"questions": generated}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Generated and upserted {len(generated)} AI Practice questions; {failures} topic failures. Saved {OUTPUT_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
