from flask_cors import CORS
import json
import os
from google import genai
from flask import Flask, request, jsonify
 
app = Flask(__name__)
CORS(app)
 
API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=API_KEY)
 
# ✅ 三类分组映射（与 rules.json 中的 name 字段完全对应）
CATEGORY_RULES = {
    "Opening": [
        "Agenda Setting",
        "Agenda Clarity",
        "Rapport Building"
    ],
    "Conducting": [
        "Questioning Strategy and Adherence",
        "Responsiveness and Active Listening",
        "Job Relevant Probing",
        "Time Management",
        "Risk Management"
    ],
    "Closing": [
        "Candidate Question Invitation",
        "Interview Closing",
        "Closing Quality",
        "Warmth and Professional Demeanor",
        "Selling Roblox"
    ]
}
 
 
def evaluate_transcript(content, categories=None):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        rules_path = os.path.join(base_dir, "rules.json")
        with open(rules_path, "r", encoding="utf-8") as f:
            rules = json.load(f)
    except Exception as e:
        return {"error": f"can't find rules.json file: {str(e)}"}
 
    # ✅ 按选中的 categories 过滤 rules，再送给 LLM
    if categories:
        selected_names = []
        for cat in categories:
            selected_names.extend(CATEGORY_RULES.get(cat, []))
        rules = [r for r in rules if r["name"] in selected_names]
 
    if not rules:
        return {"error": "No rules matched. Please select at least one valid category."}
 
    prompt = f"""
    You are an expert HR interviewer and transcript evaluator. 
    Your task is to evaluate the following interview transcript based on the provided rules.
    
    [EVALUATION RULES]:
    {json.dumps(rules, indent=2)}
    
    [INTERVIEW TRANSCRIPT]:
    {content}
    
    [INSTRUCTIONS]:
    1. Evaluate the transcript against EACH rule in the rules list.
    2. Understand the semantic context. Do not just look for exact keywords.
    3. Output your response STRICTLY as a JSON array. 
    4. Each JSON object in the array MUST contain the following keys:
        - Rule Name: string (copied directly from the rule)
        - Type: string ("binary" or "scaled")
        - Reasoning: string (Provide a brief 1-2 sentence explanation quoting evidence from the transcript)
        - Result: integer — for BOTH binary and scaled types, output the integer score from the rule's scale.
            Binary rules use scale [1, 2]: output 1 (criterion not met) or 2 (criterion met).
            Scaled rules use scale [1, 2, 3]: output 1 (Poor), 2 (Adequate), or 3 (Excellent).
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        results = json.loads(response.text)
        return results
    except Exception as e:
        return {"error": str(e)}
 
 
@app.route('/score', methods=['POST'])
def score():
    data = request.json
    text = data.get("text", "")
    # ✅ 接收前端传来的 categories，默认跑全部三类
    categories = data.get("categories", ["Opening", "Conducting", "Closing"])
 
    if not text:
        return jsonify({"error": "Please enter the interview content"})
    if not categories:
        return jsonify({"error": "Please select at least one category to score"})
 
    result = evaluate_transcript(text, categories)
    return jsonify(result)
 
 
# ✅ 健康检查接口（Render 需要）
@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Interviewer Scoring AI is running"})
 
 
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
 
