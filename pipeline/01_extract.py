#!/usr/bin/env python3
"""Extract text and embedded figures from GATE past-paper PDFs."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from pathlib import Path

import fitz
import pytesseract
from PIL import Image


PIPELINE_DIR = Path(__file__).resolve().parent
PDFS_DIR = PIPELINE_DIR / "pdfs"
RAW_OUTPUT_DIR = PIPELINE_DIR / "output" / "raw"
IMAGES_OUTPUT_DIR = PIPELINE_DIR / "output" / "images"
FILENAME_PATTERN = re.compile(r"^GATE_(?P<year>\d{4})_(?P<paper_set>.+)\.pdf$", re.IGNORECASE)
MIN_TEXT_CHARACTERS = 50


def parse_filename(pdf_path: Path) -> tuple[int, str]:
    """Return year and paper-set identifier encoded in a PDF filename."""
    match = FILENAME_PATTERN.fullmatch(pdf_path.name)
    if match is None:
        raise ValueError(
            f"Expected a filename like GATE_2024_CS_set1.pdf, got {pdf_path.name!r}"
        )
    return int(match.group("year")), match.group("paper_set")


def ocr_page(page: fitz.Page) -> str:
    """Render a page and return its OCR text."""
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    with Image.open(io.BytesIO(pixmap.tobytes("png"))) as image:
        return pytesseract.image_to_string(image)


def save_page_images(document: fitz.Document, page: fitz.Page, year: int, paper_set: str) -> int:
    """Save embedded page images as PNGs and return the number saved."""
    image_refs: list[int] = []
    for image_info in page.get_images(full=True):
        xref = image_info[0]
        if xref > 0 and xref not in image_refs:
            image_refs.append(xref)

    saved_count = 0
    for image_number, xref in enumerate(image_refs, start=1):
        try:
            pixmap = fitz.Pixmap(document, xref)
            if pixmap.n > 3:
                pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
            image_path = IMAGES_OUTPUT_DIR / (
                f"{year}_{paper_set}_p{page.number + 1}_{image_number}.png"
            )
            pixmap.save(str(image_path))
            saved_count += 1
        except (fitz.FileDataError, RuntimeError, ValueError) as error:
            print(
                f"Warning: could not save image xref {xref} on page {page.number + 1}: {error}",
                file=sys.stderr,
            )
    return saved_count


def process_pdf(pdf_path: Path) -> tuple[int, int]:
    """Extract every page and embedded image from one PDF."""
    year, paper_set = parse_filename(pdf_path)
    pages: list[dict[str, object]] = []
    ocr_count = 0

    with fitz.open(pdf_path) as document:
        for page in document:
            text = page.get_text("text")
            method = "text"
            if len(text.strip()) < MIN_TEXT_CHARACTERS:
                text = ocr_page(page)
                method = "ocr"
                ocr_count += 1

            save_page_images(document, page, year, paper_set)
            pages.append(
                {
                    "page_no": page.number + 1,
                    "text": text,
                    "method": method,
                }
            )

    output_path = RAW_OUTPUT_DIR / f"{pdf_path.stem}.json"
    with output_path.open("w", encoding="utf-8") as output_file:
        json.dump(
            {"year": year, "paper_set": paper_set, "pages": pages},
            output_file,
            ensure_ascii=False,
            indent=2,
        )
        output_file.write("\n")

    return len(pages), ocr_count


def resolve_input_file(argument: str) -> Path:
    """Resolve --file from the current directory or pipeline/pdfs/."""
    supplied_path = Path(argument).expanduser()
    candidates = [supplied_path]
    if not supplied_path.is_absolute():
        candidates.append(PDFS_DIR / supplied_path)

    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise FileNotFoundError(f"PDF not found: {argument}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--file",
        help="Process one PDF (path or filename in pipeline/pdfs/) instead of all PDFs.",
    )
    args = parser.parse_args()

    RAW_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.file:
        try:
            pdf_paths = [resolve_input_file(args.file)]
        except FileNotFoundError as error:
            parser.error(str(error))
    else:
        pdf_paths = sorted(
            (path for path in PDFS_DIR.iterdir() if path.is_file() and path.suffix.lower() == ".pdf"),
            key=lambda path: path.name.lower(),
        ) if PDFS_DIR.is_dir() else []
        if not pdf_paths:
            print(f"No PDFs found in {PDFS_DIR}")
            return 0

    failures = 0
    print("Extraction summary:")
    for pdf_path in pdf_paths:
        try:
            page_count, ocr_count = process_pdf(pdf_path)
            print(f"- {pdf_path.name}: {page_count} pages, {ocr_count} needed OCR")
        except Exception as error:
            failures += 1
            print(f"- {pdf_path.name}: failed ({error})", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
