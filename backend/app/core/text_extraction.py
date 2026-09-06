import io
import re
from typing import Optional
import logging
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_text_from_pdf(content: bytes, max_pages: int = 100, max_chars: int = 100_000) -> Optional[str]:
    """
    Extract readable text from PDF bytes safely.
    Returns normalized text truncated to max_chars, or None if no text could be extracted.
    """
    if not content:
        return None
    try:
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                return None

        extracted_parts: list[str] = []
        total_len = 0
        pages_to_process = min(len(reader.pages), max_pages)

        for i in range(pages_to_process):
            try:
                page_text = reader.pages[i].extract_text()
                if page_text and page_text.strip():
                    clean_text = " ".join(page_text.split())
                    extracted_parts.append(clean_text)
                    total_len += len(clean_text)
                    if total_len >= max_chars:
                        break
            except Exception as page_exc:
                logger.debug(f"Error extracting page {i}: {page_exc}")
                continue

        if not extracted_parts:
            return None

        full_text = " ".join(extracted_parts)
        if len(full_text) > max_chars:
            full_text = full_text[:max_chars]
        return full_text.strip() or None
    except Exception as exc:
        logger.warning(f"Could not extract text from PDF: {exc}")
        return None


def extract_search_snippet(text: str | None, search: str | None, max_chars: int = 140) -> Optional[str]:
    """
    Generate a relevant context snippet around the search query in text.
    """
    if not text or not search or not search.strip():
        return None

    query = search.strip()
    match = re.search(re.escape(query), text, re.IGNORECASE)
    if not match:
        words = [w for w in query.split() if len(w) > 2]
        for w in words:
            match = re.search(re.escape(w), text, re.IGNORECASE)
            if match:
                break

    if not match:
        return None

    start_idx, end_idx = match.span()
    context_radius = max_chars // 2

    snippet_start = max(0, start_idx - context_radius)
    snippet_end = min(len(text), end_idx + context_radius)

    if snippet_start > 0:
        space_idx = text.find(" ", snippet_start)
        if 0 <= space_idx < start_idx:
            snippet_start = space_idx + 1

    if snippet_end < len(text):
        space_idx = text.rfind(" ", end_idx, snippet_end)
        if space_idx > end_idx:
            snippet_end = space_idx

    snippet = text[snippet_start:snippet_end].strip()
    prefix = "..." if snippet_start > 0 else ""
    suffix = "..." if snippet_end < len(text) else ""

    return f"{prefix}{snippet}{suffix}"
