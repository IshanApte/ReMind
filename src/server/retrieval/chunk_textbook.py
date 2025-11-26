"""
Semantic + size-constrained chunking for the cleaned Human Biology textbook.

Reads the cleaned text file (e.g. BookId-576-HumanBiol_clean.txt),
splits it at semantic breakpoints (chapters/sections/glossary), then
merges/splits segments to keep chunks within a word-count window, and
writes a single JSON file with all chunks.

Example:

    python chunk_textbook.py \
        --input /Users/ishanapte/Documents/TemporalMemory/BookId-576-HumanBiol_clean.txt \
        --output /Users/ishanapte/Documents/TemporalMemory/BookId-576-HumanBiol_chunks.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Optional, Tuple
from typing import Dict


CHAPTER_RE = re.compile(r"^\s*CHAPTER\s+(\d+)\.", re.IGNORECASE)
SECTION_RE = re.compile(r"^\s*(\d+(?:\.\d+)+)\s+(.+)$")
GLOSSARY_RE = re.compile(r"\bGLOSSARY\b", re.IGNORECASE)


@dataclass
class Segment:
    start_line: int
    end_line: int
    chapter: Optional[str]
    section: Optional[str]
    heading: Optional[str]
    text_lines: List[str]

    @property
    def text(self) -> str:
        # Keep some structure but collapse extra whitespace
        return " ".join(line.strip() for line in self.text_lines if line.strip())

    @property
    def word_count(self) -> int:
        if not self.text:
            return 0
        return len(self.text.split())


def classify_heading(
    line: str, current_chapter: Optional[str]
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Return (chapter, section, heading) if this line is a heading, else (None, None, None).
    - chapter: like "1" or "Glossary"
    - section: like "1.2" (for numbered sections)
    - heading: human-readable title
    """
    stripped = line.strip()

    # Glossary treated as its own chapter-level section
    if GLOSSARY_RE.search(stripped):
        return "Glossary", None, "Glossary"

    # CHAPTER X.
    m_ch = CHAPTER_RE.match(stripped)
    if m_ch:
        chapter_num = m_ch.group(1)
        return chapter_num, None, f"Chapter {chapter_num}"

    # Numbered section, e.g. "1.2 Structural Organization of the Human Body"
    m_sec = SECTION_RE.match(stripped)
    if m_sec:
        label = m_sec.group(1)
        title = m_sec.group(2).strip()
        return current_chapter, label, title

    return None, None, None


def build_semantic_segments(lines: Iterable[str]) -> List[Segment]:
    segments: List[Segment] = []
    current_chapter: Optional[str] = None
    current_section: Optional[str] = None
    current_heading: Optional[str] = None

    current_lines: List[str] = []
    current_start_line: int = 1

    for idx, line in enumerate(lines, start=1):
        chapter, section, heading = classify_heading(line, current_chapter)

        is_heading = chapter is not None or section is not None or heading is not None

        if is_heading:
            # Close previous segment if it has content
            if current_lines:
                segments.append(
                    Segment(
                        start_line=current_start_line,
                        end_line=idx - 1,
                        chapter=current_chapter,
                        section=current_section,
                        heading=current_heading,
                        text_lines=current_lines,
                    )
                )
                current_lines = []

            # Update chapter/section/heading context
            if chapter is not None:
                current_chapter = chapter
                # Reset section when chapter changes
                if section is None:
                    current_section = None
            if section is not None:
                current_section = section
            if heading is not None:
                current_heading = heading

            current_start_line = idx

        # Always keep the line in the current segment
        current_lines.append(line.rstrip("\n"))

    # Close final segment
    if current_lines:
        segments.append(
            Segment(
                start_line=current_start_line,
                end_line=idx,
                chapter=current_chapter,
                section=current_section,
                heading=current_heading,
                text_lines=current_lines,
            )
        )

    # Filter out any completely empty segments
    return [seg for seg in segments if seg.word_count > 0]


def split_large_segment(seg: Segment, max_words: int) -> List[Segment]:
    """Split a large segment into smaller ones at sentence-ish boundaries."""
    text = seg.text
    if seg.word_count <= max_words:
        return [seg]

    # Rough sentence split
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: List[Segment] = []
    current_sentences: List[str] = []
    current_wc = 0

    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        wc = len(sent.split())
        if current_sentences and current_wc + wc > max_words:
            # Flush current chunk
            new_seg = Segment(
                start_line=seg.start_line,
                end_line=seg.end_line,
                chapter=seg.chapter,
                section=seg.section,
                heading=seg.heading,
                text_lines=[" ".join(current_sentences)],
            )
            chunks.append(new_seg)
            current_sentences = [sent]
            current_wc = wc
        else:
            current_sentences.append(sent)
            current_wc += wc

    if current_sentences:
        new_seg = Segment(
            start_line=seg.start_line,
            end_line=seg.end_line,
            chapter=seg.chapter,
            section=seg.section,
            heading=seg.heading,
            text_lines=[" ".join(current_sentences)],
        )
        chunks.append(new_seg)

    return chunks


def enforce_size_constraints(
    segments: List[Segment], min_words: int, max_words: int
) -> List[Segment]:
    """Merge small segments and split overly large ones."""
    merged: List[Segment] = []
    buffer_seg: Optional[Segment] = None

    def flush_buffer():
        nonlocal buffer_seg
        if buffer_seg is not None:
            merged.append(buffer_seg)
            buffer_seg = None

    for seg in segments:
        if buffer_seg is None:
            buffer_seg = seg
        else:
            # If buffer is too small, merge with next
            if buffer_seg.word_count < min_words:
                combined_lines = buffer_seg.text_lines + seg.text_lines
                buffer_seg = Segment(
                    start_line=buffer_seg.start_line,
                    end_line=seg.end_line,
                    chapter=buffer_seg.chapter or seg.chapter,
                    section=buffer_seg.section or seg.section,
                    heading=buffer_seg.heading or seg.heading,
                    text_lines=combined_lines,
                )
            else:
                flush_buffer()
                buffer_seg = seg

    flush_buffer()

    # Now split any overly large segments
    final_chunks: List[Segment] = []
    for seg in merged:
        if seg.word_count > max_words:
            final_chunks.extend(split_large_segment(seg, max_words))
        else:
            final_chunks.append(seg)

    return final_chunks


def chunks_to_json_dicts(chunks: List[Segment]) -> List[dict]:
    json_chunks = []
    for idx, seg in enumerate(chunks):
        json_chunks.append(
            {
                "id": idx,
                "chapter": seg.chapter,
                "section": seg.section,
                "heading": seg.heading,
                "start_line": seg.start_line,
                "end_line": seg.end_line,
                "word_count": seg.word_count,
                "text": seg.text,
            }
        )
    return json_chunks


def attach_embeddings_to_json_chunks(
    json_chunks: List[Dict], model_name: str = "all-MiniLM-L6-v2", batch_size: int = 64
) -> List[Dict]:
    """Compute sentence-transformer embeddings for each chunk's `text` and attach
    them under the `embedding` key (as a list of floats).

    This function loads the specified SentenceTransformer model and encodes the
    chunk texts in batches to avoid OOM on large inputs.
    """
    try:
        from sentence_transformers import SentenceTransformer
    except Exception as e:
        raise RuntimeError(
            "Please install 'sentence-transformers' (pip install sentence-transformers)"
        ) from e

    model = SentenceTransformer(model_name)

    texts = [c.get("text", "") for c in json_chunks]

    # Use the model's batching; convert_to_numpy yields a numpy array we can iterate
    embeddings = model.encode(
        texts, batch_size=batch_size, show_progress_bar=True, convert_to_numpy=True
    )

    for i, emb in enumerate(embeddings):
        # Convert to plain Python list for JSON serialization
        json_chunks[i]["embedding"] = emb.tolist()

    return json_chunks


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Semantic + size-based chunking of cleaned Human Biology textbook."
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Path to cleaned textbook .txt file",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Path to write JSON file with chunks",
    )
    parser.add_argument(
        "--min-words",
        type=int,
        default=150,
        help="Minimum words per chunk before merging with neighbors (default: 150)",
    )
    parser.add_argument(
        "--max-words",
        type=int,
        default=700,
        help="Maximum words per chunk before splitting (default: 700)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="all-MiniLM-L6-v2",
        help="SentenceTransformer model name to compute embeddings (default: all-MiniLM-L6-v2)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Batch size to use when encoding embeddings (default: 64)",
    )
    parser.add_argument(
        "--no-embeddings",
        action="store_true",
        help="Do not compute embeddings and write raw chunks only",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    with args.input.open("r", encoding="utf-8", errors="ignore") as f:
        lines = list(f)

    semantic_segments = build_semantic_segments(lines)
    sized_chunks = enforce_size_constraints(
        semantic_segments, min_words=args.min_words, max_words=args.max_words
    )
    json_chunks = chunks_to_json_dicts(sized_chunks)

    # Optionally compute and attach embeddings
    if not getattr(args, "no_embeddings", False):
        try:
            json_chunks = attach_embeddings_to_json_chunks(
                json_chunks, model_name=args.model, batch_size=args.batch_size
            )
        except Exception:
            # Re-raise so stack trace is visible to the caller
            raise

    with args.output.open("w", encoding="utf-8") as f:
        json.dump(json_chunks, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
