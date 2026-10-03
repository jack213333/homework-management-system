from collections import deque
import hashlib
import json
from .types import Fingerprint


def winnow(units: list[str], k: int, w: int) -> list[Fingerprint]:
    """Each full window selects its rightmost minimum; duplicate selections are skipped."""
    if k < 1 or w < 1:
        raise ValueError("k 与 w 必须大于零")
    if len(units) < k + w - 1:
        return []
    queue = deque()
    result = []
    previous = -1
    for start in range(len(units) - k + 1):
        digest = hashlib.sha256(
            json.dumps(
                units[start : start + k], ensure_ascii=False, separators=(",", ":")
            ).encode()
        ).hexdigest()
        while queue and queue[-1][1] >= digest:
            queue.pop()
        queue.append((start, digest))
        while queue[0][0] <= start - w:
            queue.popleft()
        if start >= w - 1 and queue[0][0] != previous:
            previous = queue[0][0]
            result.append(Fingerprint(queue[0][1], previous, previous + k))
    return result
