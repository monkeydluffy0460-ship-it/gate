#!/usr/bin/env python3
"""Apply official answer-key PDFs to extracted questions."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import pdfplumber


PIPELINE_DIR = Path(__file__).resolve().parent
KEYS_DIR = PIPELINE_DIR / "keys"
QUESTIONS_PATH = PIPELINE_DIR / "output" / "questions.json"
OUTPUT_PATH = PIPELINE_DIR / "output" / "questions_keyed.json"
KEY_FILENAME_PATTERN = re.compile(
    r"^KEY_(?P<year>\d{4})_(?P<paper_set>.+)\.pdf$", re.IGNORECASE
)
QUESTION_NUMBER_PATTERN = re.compile(r"^\s*(?:Q(?:UESTION)?\s*)?(\d+)\s*\.?\s*$", re.I)
NAT_RANGE_PATTERN = re.compile(
    r"^\s*(-?\d+(?:\.\d+)?)\s*(?:to|[-–—])\s*(-?\d+(?:\.\d+)?)\s*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class AnswerKeyRow:
    year: int
    paper_set: str
    qno: int
    qtype: str
    section: str
    answer: str
    marks: str
    source_file: str


def normalize_header(value: Any) -> str:
    """Normalize table header text for column lookup."""
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def normalize_qtype(value: Any) -> str:
    """Normalize common question-type labels."""
    text = re.sub(r"[^a-z]", "", str(value or "").lower())
    aliases = {"mcq": "MCQ", "msq": "MSQ", "nat": "NAT", "numerical": "NAT"}
    return aliases.get(text, text.upper())


def clean_cell(value: Any) -> str:
    """Convert a PDF table cell to a compact string."""
    return re.sub(r"\s+", " ", str(value or "")).strip()


def find_header_indexes(row: list[Any]) -> dict[str, int] | None:
    """Return recognized column indexes when the row looks like a header."""
    aliases = {
        "qno": {"qno", "questionno", "questionnumber", "number", "qnum"},
        "qtype": {"type", "questiontype", "qtype"},
        "section": {"section", "part"},
        "answer": {"key", "answer", "answerkey", "correctanswer"},
        "marks": {"marks", "mark"},
    }
    indexes: dict[str, int] = {}
    for index, cell in enumerate(row):
        header = normalize_header(cell)
        for field, names in aliases.items():
            if header in names:
                indexes[field] = index
                break
    if "qno" in indexes and "answer" in indexes:
        return indexes
    return None


def parse_question_number(value: Any) -> int | None:
    match = QUESTION_NUMBER_PATTERN.fullmatch(clean_cell(value))
    return int(match.group(1)) if match else None


def parse_table_row(
    row: list[Any],
    indexes: dict[str, int],
    year: int,
    paper_set: str,
    source_file: str,
) -> AnswerKeyRow | None:
    """Parse one table row, ignoring headings and non-question rows."""
    def cell(field: str, default_index: int, default: str = "") -> str:
        index = indexes.get(field, default_index)
        return clean_cell(row[index]) if index < len(row) else default

    qno = parse_question_number(cell("qno", 0))
    answer = cell("answer", 3)
    qtype = normalize_qtype(cell("qtype", 1))
    if qno is None or not answer or qtype not in {"MCQ", "MSQ", "NAT"}:
        return None

    return AnswerKeyRow(
        year=year,
        paper_set=paper_set,
        qno=qno,
        qtype=qtype,
        section=cell("section", 2),
        answer=answer,
        marks=cell("marks", 4),
        source_file=source_file,
    )


def read_key_pdf(pdf_path: Path) -> list[AnswerKeyRow]:
    """Extract question answer rows from all tables in a key PDF."""
    match = KEY_FILENAME_PATTERN.fullmatch(pdf_path.name)
    if match is None:
        raise ValueError(f"Expected KEY_2024_CS_set1.pdf format, got {pdf_path.name!r}")
    year = int(match.group("year"))
    paper_set = match.group("paper_set")
    parsed: list[AnswerKeyRow] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                if not table:
                    continue
                header_indexes = find_header_indexes(table[0] or [])
                rows = table[1:] if header_indexes else table
                # The specified key layout is qno, type, section, key, marks.
                indexes = header_indexes or {
                    "qno": 0,
                    "qtype": 1,
                    "section": 2,
                    "answer": 3,
                    "marks": 4,
                }
                for row in rows:
                    if row:
                        record = parse_table_row(
                            row, indexes, year, paper_set, pdf_path.name
                        )
                        if record:
                            parsed.append(record)
    return parsed


def load_questions(path: Path) -> tuple[Any, list[dict[str, Any]]]:
    """Load supported JSON root shapes while retaining the original shape."""
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    if isinstance(data, list):
        questions = data
    elif isinstance(data, dict) and isinstance(data.get("questions"), list):
        questions = data["questions"]
    else:
        raise ValueError("questions.json must be a JSON array or an object with a questions array")
    if not all(isinstance(question, dict) for question in questions):
        raise ValueError("Every entry in questions.json must be an object")
    return data, questions


def question_key(question: dict[str, Any]) -> tuple[int, str, int] | None:
    """Build the exact year/paper_set/qno key for a question."""
    try:
        year = int(question["year"])
        paper_set = str(question["paper_set"]).strip()
        qno = int(question["qno"])
    except (KeyError, TypeError, ValueError):
        return None
    return year, paper_set.casefold(), qno


def nat_bounds(answer: str) -> tuple[Decimal, Decimal] | None:
    """Parse a NAT numeric interval such as '4.5 to 4.7'."""
    match = NAT_RANGE_PATTERN.fullmatch(answer)
    if not match:
        return None
    try:
        return Decimal(match.group(1)), Decimal(match.group(2))
    except InvalidOperation:
        return None


def apply_keys(questions: list[dict[str, Any]], key_rows: list[AnswerKeyRow]) -> tuple[int, list[str], list[str]]:
    """Apply key rows and report unmatched and question-type mismatches."""
    by_key: dict[tuple[int, str, int], dict[str, Any]] = {}
    for question in questions:
        key = question_key(question)
        if key is not None:
            by_key[key] = question

    matched = 0
    unmatched: list[str] = []
    mismatched: list[str] = []
    for row in key_rows:
        key = (row.year, row.paper_set.casefold(), row.qno)
        label = f"{row.source_file}: Q{row.qno} ({row.qtype})"
        question = by_key.get(key)
        if question is None:
            unmatched.append(label)
            continue

        question_type = normalize_qtype(question.get("qtype", question.get("type", "")))
        if question_type != row.qtype:
            mismatched.append(
                f"{label}: question has {question_type or 'unknown'}"
            )
            continue

        answer = row.answer.strip()
        question["answer"] = "MTA" if answer.upper() == "MTA" else answer
        if row.qtype == "NAT" and answer.upper() != "MTA":
            bounds = nat_bounds(answer)
            if bounds is None:
                mismatched.append(f"{label}: invalid NAT range {answer!r}")
                # Preserve the answer value but do not claim it as an official key.
                question.pop("answer", None)
                continue
            question["nat_min"] = float(bounds[0])
            question["nat_max"] = float(bounds[1])
        question["answer_source"] = "official"
        matched += 1
    return matched, unmatched, mismatched


def main() -> int:
    if not QUESTIONS_PATH.is_file():
        print(f"Questions file not found: {QUESTIONS_PATH}", file=sys.stderr)
        return 1
    if not KEYS_DIR.is_dir():
        print(f"Answer-key directory not found: {KEYS_DIR}", file=sys.stderr)
        return 1

    key_files = sorted(
        (path for path in KEYS_DIR.iterdir() if path.is_file() and path.suffix.lower() == ".pdf"),
        key=lambda path: path.name.casefold(),
    )
    if not key_files:
        print(f"No answer-key PDFs found in {KEYS_DIR}", file=sys.stderr)
        return 1

    try:
        data, questions = load_questions(QUESTIONS_PATH)
        key_rows: list[AnswerKeyRow] = []
        for pdf_path in key_files:
            try:
                key_rows.extend(read_key_pdf(pdf_path))
            except Exception as error:
                print(f"Warning: could not read {pdf_path.name}: {error}", file=sys.stderr)
        matched, unmatched, mismatched = apply_keys(questions, key_rows)

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with OUTPUT_PATH.open("w", encoding="utf-8") as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.write("\n")
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Answer-key report: {len(key_rows)} key rows, {matched} matched")
    print(f"Unmatched questions ({len(unmatched)}):")
    for item in unmatched:
        print(f"  - {item}")
    print(f"Mismatched question types / invalid keys ({len(mismatched)}):")
    for item in mismatched:
        print(f"  - {item}")
    print(f"Saved keyed questions to {OUTPUT_PATH}")
    return 0


if __file__ == "<run_path>":
    raise SystemExit(main())

if __name__ == "__main__":
    raise SystemExit(main())
