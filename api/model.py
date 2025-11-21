from typing import List
from .schemas import FeatureVector, PredictionResult, Hotspot, Position


class EnergyModel:
    """
    Placeholder model.

    Later:
    - Load ONNX or sklearn model from model_artifacts/
    - Use fv.* features as input vector
    """

    def __init__(self):
        self.version = "stub-heuristic-v1"

    def predict(self, fv: FeatureVector) -> PredictionResult:
        # Very rough score from static features
        complexity = (
            0.4 * fv.loopCount
            + 0.6 * fv.nestedLoopDepth
            + 0.3 * fv.stringConcatOps
            + 0.2 * fv.listScanOps
        )

        size_penalty = 0.0005 * fv.tokenCount
        score_raw = complexity + size_penalty

        # Squash to 0..1
        file_score = 1 - (1 / (1 + score_raw)) if score_raw > 0 else 0.0

        # Assume 1000 mJ max for now
        estimated_mJ = file_score * 1000.0

        hotspots: List[Hotspot] = []
        if fv.hotspotsSeeds:
            per = max(estimated_mJ / len(fv.hotspotsSeeds), 1.0)
            for seed in fv.hotspotsSeeds:
                hs = Hotspot(
                    start=Position(line=seed.start.line, character=seed.start.character),
                    end=Position(line=seed.end.line, character=seed.end.character),
                    score=1.0,  # will be normalized in server
                    estimate_mJ=per,
                    confidence=0.5,
                    ruleId=None,
                    suggestion=None,
                    deltaScore=None,
                )
                hotspots.append(hs)

        return PredictionResult(
            fileScore=file_score,
            estimated_mJ=estimated_mJ,
            hotspots=hotspots,
            modelVersion=self.version,
        )