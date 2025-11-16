from pydantic import BaseModel
from typing import List, Optional

class Range(BaseModel):
    start_line: int
    start_char: int
    end_line: int
    end_char: int

class FeatureVector(BaseModel):
    languageId: str
    tokenCount: int
    loopCount: int
    nestedLoopDepth: int
    stringConcatOps: int
    listScanOps: int
    functionCount: int
    avgFunctionLength: float
    hotspotsSeeds: List[Range]
    version: str

class PredictionRequest(BaseModel):
    features: FeatureVector

class Hotspot(BaseModel):
    start_line: int
    start_char: int
    end_line: int
    end_char: int
    score: float
    estimate_mJ: Optional[float] = None
    confidence: Optional[float] = None
    suggestion: Optional[str] = None

class PredictionResponse(BaseModel):
    fileScore: float
    hotspots: List[Hotspot]
    modelVersion: str