#!/usr/bin/env python3
"""Solve unanswered questions twice with Groq and label agreement confidence."""

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

PIPELINE_DIR = Path(__file__).resolve().parent
INPUT_PATH = PIPELINE_DIR / "output" / "questions_keyed.json"
OUTPUT_PATH = PIPELINE_DIR / "output" / "questions_solved.json"
CACHE_DIR = PIPELINE_DIR / "cache" / "solve"


def question_identity(question: dict[str, Any], index: int) -> str:
    basis = json.dumps(
        {key: question.get(key) for key in ("year", "paper_set", "qno", "question_text", "options")},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(f"{index}:{basis}".encode()).hexdigest()


def load_questions(path: Path) -> tuple[Any, list[dict[str, Any]]]:
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    questions = data if isinstance(data, list) else data.get("questions") if isinstance(data, dict) else None
    if not isinstance(questions, list) or not all(isinstance(item, dict) for item in questions):
        raise ValueError("Input must be an array of questions or an object containing a questions array")
    return data, questions


def has_answer(question: dict[str, Any]) -> bool:
    answer = question.get("answer")
    return answer is not None and str(answer).strip() != ""


def request_solution(client: Groq, model: str, question: dict[str, Any], cache_path: Path) -> str:
    """Return raw model content, using the on-disk response cache when available."""
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")

    prompt = {
        "year": question.get("year"),
        "paper_set": question.get("paper_set"),
        "qno": question.get("qno"),
        "qtype": question.get("qtype", question.get("type")),
        "marks": question.get("marks"),
        "question_text": question.get("question_text", ""),
        "options": question.get("options"),
        "nat_min": question.get("nat_min"),
        "nat_max": question.get("nat_max"),
    }
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Solve this GATE Computer Science question carefully. Return only valid JSON with "
                    'keys "answer" (string) and "explanation" (short string). For MSQ, use a '
                    "semicolon-separated list of option letters; for NAT, return a numeric answer "
                    "or accepted range. Do not include markdown."
                ),
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
    )
    raw = response.choices[0].message.content or ""
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


def parse_solution(raw: str) -> tuple[str, str]:
    """Extract answer and short explanation, with a safe plain-text fallback."""
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict) and payload.get("answer") is not None:
            return str(payload["answer"]).strip(), str(payload.get("explanation", "")).strip()
    except json.JSONDecodeError:
        pass
    return raw.strip(), ""


def comparable_answer(answer: str) -> str:
    normalized = re.sub(r"\s+", "", answer).strip().upper()
    # MSQ ordering is not meaningful; compare its selected letters as a set.
    if ";" in normalized:
        return ";".join(sorted(part for part in normalized.split(";") if part))
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of unanswered questions to process")
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
        client = Groq(api_key=api_key)
        eligible = [
            (index, question) for index, question in enumerate(questions)
            if not has_answer(question) and question.get("answer_source") != "official"
        ]
        if args.limit is not None:
            eligible = eligible[:args.limit]

        solved = 0
        unsure = 0
        failures = 0
        for index, question in eligible:
            identity = question_identity(question, index)
            try:
                solutions: list[tuple[str, str]] = []
                for attempt in (1, 2):
                    cache_file = CACHE_DIR / f"{identity}_attempt{attempt}.txt"
                    solutions.append(request_solution(client, model, question, cache_file))
                    if attempt == 1:
                        time.sleep(2)
                parsed = [parse_solution(raw) for raw in solutions]
                first_answer, first_explanation = parsed[0]
                second_answer, second_explanation = parsed[1]
                if first_answer and comparable_answer(first_answer) == comparable_answer(second_answer):
                    question["answer"] = first_answer
                    question["answer_source"] = "ai_agreed"
                    question["explanation"] = first_explanation or second_explanation
                    solved += 1
                else:
                    question["answer_source"] = "ai_unsure"
                    question["explanation"] = first_explanation or second_explanation
                    unsure += 1
            except Exception as error:
                failures += 1
                question["answer_source"] = "ai_unsure"
                print(f"Warning: question index {index} could not be solved: {error}", file=sys.stderr)

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Processed {len(eligible)} questions: {solved} agreed, {unsure} unsure, {failures} errors")
    print(f"Saved to {OUTPUT_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
