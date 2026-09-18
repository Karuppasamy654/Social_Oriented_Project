from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.code_intelligence.code_feature_extractor import extract_student_profile, StudentImplementationProfile, CodeFeatureEvidence
from app.code_intelligence.code_diff import analyze_code_diff

class SubmissionCodeSnapshot(BaseModel):
    submission_id: str
    problem_id: str
    code_snapshot_hash: str
    student_code: str
    starter_code: Optional[str] = ""
    created_at: str

def build_student_implementation_profile(
    submission_id: str,
    problem_id: str,
    student_code: str,
    starter_code: str = "",
    problem_title: str = "Problem"
) -> Dict[str, Any]:
    """
    Constructs an evidence-backed StudentImplementationProfile combining AST feature extraction,
    complexity analysis, and starter-vs-submission code diff analysis.
    """
    profile: StudentImplementationProfile = extract_student_profile(student_code, problem_title, problem_id)
    diff_analysis = analyze_code_diff(starter_code, student_code)

    profile_dict = profile.dict()
    profile_dict["submission_id"] = submission_id
    profile_dict["diff_analysis"] = diff_analysis
    profile_dict["student_authored_features"] = diff_analysis["student_authored_features"]

    return profile_dict
