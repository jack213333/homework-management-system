from dataclasses import dataclass, field

@dataclass
class ExtractionResult:
    status: str
    text: str = ""
    locations: list[dict] = field(default_factory=list)
    note: str = ""
