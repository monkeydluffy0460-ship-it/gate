#!/usr/bin/env python3
"""Assign syllabus-constrained topic and subtopic tags with Groq."""

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

PIPELINE_DIR = Path(__file__).resolve().parent
INPUT_PATH = PIPELINE_DIR / "output" / "questions_solved.json"
OUTPUT_PATH = PIPELINE_DIR / "output" / "questions_tagged.json"
SYLLABUS_PATH = PIPELINE_DIR / "syllabus.json"
CACHE_DIR = PIPELINE_DIR / "cache" / "tag"


def load_questions(path: Path) -> tuple[Any, list[dict[str, Any]]]:
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    questions = data if isinstance(data, list) else data.get("questions") if isinstance(data, dict) else None
    if not isinstance(questions, list) or not all(isinstance(item, dict) for item in questions):
        raise ValueError("Input must be an array of questions or an object containing a questions array")
    return data, questions


def load_syllabus() -> dict[str, list[str]]:
    with SYLLABUS_PATH.open(encoding="utf-8") as source:
        syllabus = json.load(source)
    if not isinstance(syllabus, dict) or not syllabus:
        raise ValueError("syllabus.json must be a non-empty object mapping topics to subtopics")
    if any(not isinstance(topic, str) or not isinstance(subtopics, list) for topic, subtopics in syllabus.items()):
        raise ValueError("Every syllabus entry must map a topic string to a subtopic list")
    return syllabus


def get_cached_tag(client: Groq, model: str, question: dict[str, Any], syllabus: dict[str, list[str]], cache_path: Path) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")

    allowed = [{"topic": topic, "subtopics": subtopics} for topic, subtopics in syllabus.items()]
    question_payload = {
        key: question.get(key)
        for key in ("year", "paper_set", "qno", "qtype", "question_text", "options", "explanation")
    }
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify the question using the supplied GATE CS & IT syllabus. You MUST choose "
                    "exactly one topic from the provided topic names and exactly one subtopic listed "
                    "under that topic. Do not invent, paraphrase, or return any other label. Return "
                    'only JSON: {"topic":"exact syllabus topic","subtopic":"exact allowed subtopic"}. '
                    "If multiple concepts occur, choose the primary concept."
                ),
            },
            {
                "role": "user",
                "content": json.dumps({"syllabus": allowed, "question": question_payload}, ensure_ascii=False),
            },
        ],
    )
    raw = response.choices[0].message.content or ""
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


def parse_tag(raw: str, syllabus: dict[str, list[str]]) -> tuple[str, str]:
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError(f"Model returned invalid JSON: {error}") from error
    topic = result.get("topic") if isinstance(result, dict) else None
    subtopic = result.get("subtopic") if isinstance(result, dict) else None
    if topic not in syllabus:
        raise ValueError(f"Model selected topic outside syllabus: {topic!r}")
    if subtopic not in syllabus[topic]:
        raise ValueError(f"Model selected subtopic outside topic {topic!r}: {subtopic!r}")
    return topic, subtopic


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of questions to tag")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be non-negative")

    load_dotenv(PIPELINE_DIR / ".env")
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL")
    if not api_key or not model:
        print("GROQ_API_KEY and GROQ_MODEL must be set in pipeline/.env", file=sys.stderr)
        return 1
    if not INPUT_PATH.is_file():
        print(f"Input file not found: {INPUT_PATH}", file=sys.stderr)
        return 1

    try:
        data, questions = load_questions(INPUT_PATH)
        syllabus = load_syllabus()
        client = Groq(api_key=api_key)
        selected = questions if args.limit is None else questions[:args.limit]
        failures = 0
        tagged = 0
        for index, question in enumerate(selected):
            basis = json.dumps(
                {key: question.get(key) for key in ("year", "paper_set", "qno", "question_text", "options")},
                sort_keys=True,
                ensure_ascii=False,
            )
            cache_name = hashlib.sha256(f"{index}:{basis}".encode()).hexdigest() + ".txt"
            try:
                raw = get_cached_tag(client, model, question, syllabus, CACHE_DIR / cache_name)
                question["topic"], question["subtopic"] = parse_tag(raw, syllabus)
                tagged += 1
            except Exception as error:
                failures += 1
                print(f"Warning: question index {index} could not be tagged: {error}", file=sys.stderr)
            if index < len(selected) - 1:
                time.sleep(2)

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Tagged {tagged} of {len(selected)} questions; {failures} failed validation or requests")
    print(f"Saved to {OUTPUT_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
