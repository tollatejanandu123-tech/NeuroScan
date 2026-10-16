from typing import List
from ..schemas.analysis import (
    HumanReviewRecommendation,
    QualityAssessmentResult,
    UncertaintySummary,
    ClassificationResult
)

def evaluate_human_review(
    qa_result: QualityAssessmentResult,
    uncertainty_result: UncertaintySummary,
    classification_result: ClassificationResult,
    confidence_threshold: float = 0.75
) -> HumanReviewRecommendation:
    reasons: List[str] = []
    
    # Check 1: QA status
    if qa_result.overall_status == "PROCESSING_FAILED":
        return HumanReviewRecommendation(
            review_recommended=True,
            status_label="Unable to analyze — input or processing issue",
            urgency="CRITICAL",
            reasons=["Critical data or image quality failure prevented reliable automated analysis."],
            disclaimer="Automated processing halted. Do not base any diagnostic conclusions on corrupted data."
        )

    # Check 2: QA warnings
    if qa_result.overall_status == "NEEDS_REVIEW":
        reasons.extend(qa_result.warnings)

    # Check 3: Low classifier confidence
    if classification_result.confidence < confidence_threshold:
        reasons.append(
            f"Classifier confidence ({classification_result.confidence * 100:.1f}%) is below decision threshold ({confidence_threshold * 100:.1f}%)."
        )

    # Check 4: High boundary uncertainty
    if uncertainty_result.threshold_exceeded:
        reasons.append(
            f"Boundary uncertainty ({uncertainty_result.boundary_uncertainty:.2f}) exceeds reliability limit ({uncertainty_result.threshold_used:.2f})."
        )

    # Determine status & urgency
    if len(reasons) > 0:
        review_recommended = True
        status_label = "AI analysis completed — review recommended"
        if len(reasons) >= 3 or uncertainty_result.boundary_uncertainty > 0.50:
            urgency = "HIGH"
        else:
            urgency = "MODERATE"
    else:
        review_recommended = False
        status_label = "AI analysis completed — no automated warning detected"
        urgency = "LOW"

    return HumanReviewRecommendation(
        review_recommended=review_recommended,
        status_label=status_label,
        urgency=urgency,
        reasons=reasons,
        disclaimer=(
            "Research decision-support output only. The absence of automated warnings does NOT guarantee clinical safety "
            "or diagnostic correctness. All outputs must be interpreted by a board-certified medical specialist."
        )
    )
