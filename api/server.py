from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import re

app = FastAPI(title="Code Energy Profiler API", version="0.1.0")


class Position(BaseModel):
    line: int
    character: int


class Hotspot(BaseModel):
    start: Position
    end: Position
    score: float
    ruleId: Optional[str] = None
    suggestion: Optional[str] = None
    deltaScore: Optional[float] = None
    estimate_mJ: Optional[float] = None
    confidence: Optional[float] = None


class PredictRequest(BaseModel):
    language: str
    code: str


class PredictResponse(BaseModel):
    fileScore: float
    hotspots: List[Hotspot]
    modelVersion: str = "api-heuristic-v1"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Heuristic pass that mirrors the README:
    - Detect loops
    - Flag string += in loops
    - Flag linear membership scans (e.g., `if x in list:` in Python or `array.includes(x)` in JS)
    - Flag nested loops
    This is intentionally simple and local-only compatible.
    """
    lines = req.code.splitlines()
    hotspots: List[Hotspot] = []

    # Naive loop detection: "for ... in" (Python), "for (...)" (JS)
    loop_lines = set()
    for i, line in enumerate(lines):
        text = line.strip()
        if re.search(r'^\s*for\s+.+:\s*$', line):  # Python for
            loop_lines.add(i)
        elif re.search(r'^\s*for\s*\(.*\)\s*{?\s*$', line):  # JS for
            loop_lines.add(i)

    # Detect nested loops (very naive: consecutive loop lines)
    prev_loop = None
    for i in sorted(loop_lines):
        if prev_loop is not None and i - prev_loop <= 5:
            hotspots.append(
                Hotspot(
                    start=Position(line=prev_loop, character=0),
                    end=Position(line=i, character=len(lines[i]) if i < len(lines) else 0),
                    score=0.75,
                    ruleId="nested-loops",
                    suggestion="Consider precomputing with a set/dict to avoid nested iteration.",
                    deltaScore=0.25,
                    confidence=0.7,
                )
            )
        prev_loop = i

    # Detect string += in loops
    for i in sorted(loop_lines):
        # Inspect a small window "inside" the loop
        for j in range(i + 1, min(i + 12, len(lines))):
            body = lines[j]
            if "+=" in body and (("'" in body) or ('"' in body)):
                hotspots.append(
                    Hotspot(
                        start=Position(line=j, character=0),
                        end=Position(line=j, character=len(body)),
                        score=0.8,
                        ruleId="string-plus-equals-in-loop",
                        suggestion="Avoid string += in loops; accumulate into a list and join once.",
                        deltaScore=0.3,
                        confidence=0.8,
                    )
                )

    # Detect linear membership scans
    for i, line in enumerate(lines):
        text = line.strip()
        if req.language.lower().startswith("py"):
            if re.search(r'\bif\s+.+\s+in\s+\[.+\]:', text):
                hotspots.append(
                    Hotspot(
                        start=Position(line=i, character=0),
                        end=Position(line=i, character=len(line)),
                        score=0.6,
                        ruleId="python-linear-membership",
                        suggestion="Use a set for O(1) membership checks instead of a list.",
                        deltaScore=0.2,
                        confidence=0.7,
                    )
                )
        else:
            if re.search(r'\bif\s*\(.+\.includes\(.+\)\)', text):
                hotspots.append(
                    Hotspot(
                        start=Position(line=i, character=0),
                        end=Position(line=i, character=len(line)),
                        score=0.6,
                        ruleId="js-linear-membership",
                        suggestion="Use a Set for O(1) membership checks instead of an array.",
                        deltaScore=0.2,
                        confidence=0.7,
                    )
                )

    file_score = max([h.score for h in hotspots], default=0.0)
    return PredictResponse(fileScore=file_score, hotspots=hotspots, modelVersion="api-heuristic-v1")