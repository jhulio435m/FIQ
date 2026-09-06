import io
from pypdf import PdfWriter
from app.core.text_extraction import extract_text_from_pdf, extract_search_snippet


def test_extract_search_snippet_cases():
    assert extract_search_snippet(None, "reactores") is None
    assert extract_search_snippet("", "reactores") is None
    assert extract_search_snippet("texto", None) is None
    assert extract_search_snippet("texto", "   ") is None
    assert extract_search_snippet("abc def ghi", "xyz") is None

    long_text = (
        "En la facultad de ingenieria quimica se desarrollan investigaciones sobre "
        "reactores de lecho fluidizado continuo para catalisis heterogenea avanzada."
    )
    snippet = extract_search_snippet(long_text, "lecho fluidizado")
    assert snippet is not None
    assert "lecho fluidizado" in snippet.lower()

    # Fallback to single word in multi-word query
    snippet_word = extract_search_snippet(long_text, "investigaciones computacionales")
    assert snippet_word is not None
    assert "investigaciones" in snippet_word.lower()


def test_extract_text_from_pdf_empty_and_corrupt():
    assert extract_text_from_pdf(b"") is None
    assert extract_text_from_pdf(b"not a valid pdf file") is None


def test_extract_text_from_pdf_valid():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buffer = io.BytesIO()
    writer.write(buffer)
    pdf_bytes = buffer.getvalue()

    # Blank page has no text, should return None
    assert extract_text_from_pdf(pdf_bytes) is None
