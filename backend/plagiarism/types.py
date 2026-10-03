from dataclasses import dataclass, field


@dataclass
class ExtractionResult:
    status: str
    text: str = ""
    locations: list[dict] = field(default_factory=list)
    note: str = ""


@dataclass
class NormalizedContent:
    units: list[str]
    raw_spans: list[tuple[int, int]]


@dataclass(frozen=True)
class Fingerprint:
    digest: str
    unit_start: int
    unit_end: int


@dataclass
class PairResult:
    mode: str
    coverage_a: float | None = None
    coverage_b: float | None = None
    exact_duplicate: bool = False
    matches: list[dict] = field(default_factory=list)
    note: str = ""
