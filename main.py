from flask_cors import CORS
import json
import google.generativeai as genai
from flask import Flask, request, jsonify

# ==========================================
# 1. 配置 Flask（让网页能调用这个程序）
# ==========================================
app = Flask(__name__)
CORS(app)
# ==========================================
# 2. 配置 Gemini API（你原来的代码）
# ==========================================
API_KEY = "AIzaSyB8se4iclHxAUtC5_7W2d-6EETHjr6wtVs"  # 这里保持你原来的 key
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-flash-latest')

# ==========================================
# 3. 核心评分函数（你原来的逻辑）
# ==========================================
def evaluate_transcript(content):
    try:
        with open("D:/Downloaded/interviewer-scoring-ai/interviewer-scoring-ai/rules.json", "r", encoding="utf-8") as f:
            rules = json.load(f)
    except:
        return {"error": "can't find rules.json file"}

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

# ==========================================
# 4. 接口：让前端 UI 调用这里
# ==========================================
@app.route('/score', methods=['POST'])
def score():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "Please enter the interview content"})
    
    result = evaluate_transcript(text)
    return jsonify(result)

# ==========================================
# 5. 启动服务
# ==========================================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)