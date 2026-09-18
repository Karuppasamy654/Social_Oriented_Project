from .question_retriever import QuestionRetriever
from .question_ranker import QuestionRanker
from .answer_evaluator import AnswerEvaluator
from .speech_analyzer import SpeechAnalyzer
from .proctoring_analyzer import ProctoringAnalyzer
from .interview_scorer import InterviewScorer
from .feedback_engine import FeedbackEngine
from .recommendation_engine import RecommendationEngine

class InterviewModelRegistry:
    def __init__(self):
        self.version = "1.0.0"
        self.retriever = QuestionRetriever()
        self.ranker = QuestionRanker()
        self.answer_evaluator = AnswerEvaluator()
        self.speech_analyzer = SpeechAnalyzer()
        self.proctoring_analyzer = ProctoringAnalyzer()
        self.scorer = InterviewScorer()
        self.feedback_engine = FeedbackEngine()
        self.recommendation_engine = RecommendationEngine()

    def get_info(self):
        return {
            "registry_version": self.version,
            "retriever": "QuestionRetriever (v1.0.0)",
            "ranker": "QuestionRanker (v1.0.0)",
            "evaluator": "AnswerEvaluator (v1.0.0)",
            "proctoring": "ProctoringAnalyzer (v1.0.0)",
            "scorer": "InterviewScorer (v1.0.0)"
        }

_global_registry = None

def get_interview_registry() -> InterviewModelRegistry:
    global _global_registry
    if _global_registry is None:
        _global_registry = InterviewModelRegistry()
    return _global_registry
