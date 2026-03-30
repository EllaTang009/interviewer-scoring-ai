rules = [
    {"id": 1, "type": "yes_no", "description": "是否表达清晰"},
    {"id": 2, "type": "score_1_3", "description": "沟通能力评分"}
]

text = "候选人表达比较清晰，但有点紧张"

def evaluate(text, rule):
    # 先用假逻辑（后面换AI）
    if rule["type"] == "yes_no":
        return "Yes"
    else:
        return 2

for rule in rules:
    result = evaluate(text, rule)
    print(f"规则 {rule['id']} 结果：{result}")