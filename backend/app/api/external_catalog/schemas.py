from pydantic import BaseModel, Field


class ExternalWork(BaseModel):
    source: str
    external_id: str
    resource_type: str
    title: str
    authors: list[str] = Field(default_factory=list)
    summary: str | None = None
    publisher: str | None = None
    published_year: int | None = None
    published_date: str | None = None
    isbn: str | None = None
    doi: str | None = None
    cover_url: str | None = None
    external_url: str | None = None
    open_access_url: str | None = None
    license: str | None = None
    subjects: list[str] = Field(default_factory=list)


class ExternalSearchResponse(BaseModel):
    results: list[ExternalWork] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
