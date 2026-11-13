#!/usr/bin/env python3
"""Upload tagged questions and referenced question images to Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv
from supabase import create_client

PIPELINE_DIR = Path(__file__).resolve().parent
INPUT_PATH = PIPELINE_DIR / "output" / "questions_tagged.json"
IMAGES_DIR = PIPELINE_DIR / "output" / "images"
BUCKET_NAME = "question-images"
TABLE_COLUMNS = {
    "id", "year", "paper_set", "section", "topic", "subtopic", "qtype", "marks",
    "question_text", "options", "answer", "nat_min", "nat_max", "explanation",
    "image_url", "answer_source", "is_generated", "text_hash",
}


def load_questions(path: Path) -> tuple[Any, list[dict[str, Any]]]:
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    questions = data if isinstance(data, list) else data.get("questions") if isinstance(data, dict) else None
    if not isinstance(questions, list) or not all(isinstance(item, dict) for item in questions):
        raise ValueError("Input must be an array of questions or an object containing a questions array")
    return data, questions


def ensure_bucket(client: Any) -> None:
    """Create a public bucket if it does not exist; tolerate an existing bucket."""
    try:
        client.storage.create_bucket(BUCKET_NAME, options={"public": True})
    except Exception as error:
        message = str(error).lower()
        if "exist" not in message and "already" not in message and "duplicate" not in message:
            # Some SDK versions return a storage error for existing buckets; verify before failing.
            try:
                client.storage.get_bucket(BUCKET_NAME)
            except Exception:
                raise error


def upload_images(client: Any) -> dict[str, str]:
    """Upload all PNG/JPEG images and return local names to public URLs."""
    uploaded: dict[str, str] = {}
    if not IMAGES_DIR.is_dir():
        return uploaded
    for image_path in sorted(path for path in IMAGES_DIR.iterdir() if path.is_file()):
        content_type = mimetypes.guess_type(image_path.name)[0]
        if content_type not in {"image/png", "image/jpeg", "image/webp"}:
            continue
        storage_path = image_path.name
        with image_path.open("rb") as image_file:
            client.storage.from_(BUCKET_NAME).upload(
                storage_path,
                image_file.read(),
                file_options={"content-type": content_type, "upsert": "true"},
            )
        public_url = client.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        if isinstance(public_url, dict):
            public_url = public_url.get("publicUrl") or public_url.get("public_url")
        if not public_url:
            raise RuntimeError(f"Could not get public URL for {storage_path}")
        uploaded[image_path.name] = str(public_url)
    return uploaded


def referenced_image_name(question: dict[str, Any]) -> str | None:
    """Get a local image filename from supported question image reference fields."""
    for key in ("image_url", "image_path", "image_filename"):
        value = question.get(key)
        if not value:
            continue
        value = str(value).strip()
        if value.startswith(("http://", "https://")):
            filename = Path(unquote(urlparse(value).path)).name
        else:
            filename = Path(value).name
        if filename:
            return filename
    return None


def build_row(question: dict[str, Any], uploaded: dict[str, str]) -> dict[str, Any]:
    row = {key: value for key, value in question.items() if key in TABLE_COLUMNS}
    image_name = referenced_image_name(question)
    if image_name in uploaded:
        row["image_url"] = uploaded[image_name]
    elif question.get("image_url") and str(question["image_url"]).startswith(("http://", "https://")):
        row["image_url"] = question["image_url"]
    else:
        row["image_url"] = None

    # qno is pipeline metadata and not a column in the current questions table.
    question_text = str(question.get("question_text") or "").strip()
    identity = "\x1f".join(
        str(question.get(field) or "") for field in ("year", "paper_set", "section", "qno")
    )
    hash_input = f"{identity}\x1f{question_text}"
    row["text_hash"] = str(question.get("text_hash") or hashlib.sha256(hash_input.encode("utf-8")).hexdigest())
    return row


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of questions to upsert")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be non-negative")

    load_dotenv(PIPELINE_DIR / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in pipeline/.env", file=sys.stderr)
        return 1
    if not INPUT_PATH.is_file():
        print(f"Input file not found: {INPUT_PATH}", file=sys.stderr)
        return 1

    try:
        data, questions = load_questions(INPUT_PATH)
        client = create_client(supabase_url, service_key)
        ensure_bucket(client)
        uploaded = upload_images(client)
        selected = questions if args.limit is None else questions[:args.limit]
        rows = [build_row(question, uploaded) for question in selected]
        if rows:
            client.table("questions").upsert(rows, on_conflict="text_hash").execute()

        # Write image URL updates back to the pipeline output for repeatable runs.
        for question in selected:
            image_name = referenced_image_name(question)
            if image_name in uploaded:
                question["image_url"] = uploaded[image_name]
        output_path = PIPELINE_DIR / "output" / "questions_uploaded.json"
        output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception as error:
        print(f"Upload failed: {error}", file=sys.stderr)
        return 1

    print(f"Uploaded {len(uploaded)} images and upserted {len(rows)} questions")
    print(f"Image public URLs are in the uploaded question records; output saved to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
