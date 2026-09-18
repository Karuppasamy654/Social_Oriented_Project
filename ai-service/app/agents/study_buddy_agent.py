import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai = None

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
    except ImportError:
        genai = None

def generate_study_buddy_response(user_prompt: str, problem_title: str = "", user_code: str = "", page_context: str = "global", hint_level: int = 1) -> str:
    if not genai or not GEMINI_API_KEY:
        if "hint" in user_prompt.lower():
            if hint_level == 1:
                return f"💡 **Hint Level 1 (Conceptual)**: For '{problem_title}', consider how storing previously seen elements in a Hash Set or Map could allow O(1) checking instead of nested loop lookups."
            elif hint_level == 2:
                return f"🔍 **Hint Level 2 (Directional)**: As you iterate through the elements, calculate `target - current_value` and check if that complement already exists in your map."
            elif hint_level == 3:
                return f"🛠️ **Hint Level 3 (Algorithmic)**: Initialize a map `seen = dict()`. For index `i` and `num` in `nums`: if `target - num` in `seen`, return `[seen[target - num], i]`. Otherwise store `seen[num] = i`."
            else:
                return "📝 **Hint Level 4 (Pseudocode)**:\n```python\ndef solve(nums, target):\n    seen = dict()\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i\n```"
        return f"🤖 **Study Buddy**: I'm here to help you solve '{problem_title or 'this problem'}'. Let me know if you need a conceptual hint, complexity analysis, or debugging help!"

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        system_instructions = f"""You are the friendly AI Study Buddy tutor on CodeBuddy.
Your role is to guide the user without spoiling complete code solutions immediately.
Current Problem: {problem_title}
Page Context: {page_context}
User Current Code Snippet:
```
{user_code}
```
User Prompt: {user_prompt}
Provide helpful, encouraging, and clear technical explanation."""
        
        response = model.generate_content(system_instructions)
        return response.text if response.text else "I am here to guide your learning!"
    except Exception as e:
        return f"🤖 **Study Buddy**: Consider analyzing the time complexity of your loop bounds. Let me know if you'd like a hint!"
