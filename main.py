
from flask_cors import CORS
import json
import os
import google.generativeai as genai
from flask import Flask, request, jsonify
 
app = Flask(__name__)
CORS(app)
 
# ✅ 从环境变量读取 API Key（不硬编码，安全）
API_KEY = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')
 
def evaluate_transcript(content):
    try:
        # ✅ 用相对路径，不用绝对路径
        base_dir = os.path.dirname(os.path.abspath(__file__))
        rules_path = os.path.join(base_dir, "rules.json")
        with open(rules_path, "r", encoding="utf-8") as f:
            rules = json.load(f)
    except Exception as e:
        return {"error": f"can't find rules.json file: {str(e)}"}
 
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
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
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
    if not text:
        return jsonify({"error": "Please enter the interview content"})
    result = evaluate_transcript(text)
    return jsonify(result)
 
# ✅ 健康检查接口（Render 需要）
@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Interviewer Scoring AI is running"})
 
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
