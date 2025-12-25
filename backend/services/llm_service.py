import os
import json
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# ================= 环境配置与初始化 =================
current_file_path = Path(__file__).resolve()
project_root = current_file_path.parent.parent
env_path = project_root / ".env"

print(f"🔍 [Debug] 正在加载配置文件: {env_path}")
load_dotenv(dotenv_path=env_path)

# 👇 核心切换：读取七牛配置
api_key = os.getenv("QINIU_API_KEY")
base_url = os.getenv("QINIU_BASE_URL", "https://ap-gate-z0.qiniuapi.com/v1")
MODEL_NAME = os.getenv("QINIU_MODEL_NAME", "deepseek/deepseek-v3.2-251201")

if not api_key:
    #print("❌ [Fatal] 未找到 QINIU_API_KEY，请检查 .env 文件！")
    final_api_key = "MISSING"
else:
    final_api_key = api_key
    #print(f"✅ [Success] 七牛 API Key 加载成功 (长度: {len(api_key)})")

# 初始化客户端 (带超时保护)
client = OpenAI(
    api_key=final_api_key,
    base_url=base_url,
    timeout=60.0, # 全局 60秒超时，防止无限等待
)

print(f"🔌 [LLM Service] 已连接: {MODEL_NAME}")


# =================  核心 PROMPTS =================

# 1. 上传分类 Prompt (包含 themes 和 tags)
PROMPT_UPLOAD = """
# 角色
你是一位专业的作文素材架构师。你的任务是将用户输入的非结构化文本{{input}}进行清洗、拆解，并转化为结构化的素材卡片列表。

# 核心原则 (必须遵守)
**严禁脑补**：绝对不要补全原文中看似缺失的词语。如果原文是 "审视XX的维度"，你必须保留 "XX"，绝不能改成 "审视问题的维度"。

## 技能 1: 智能拆分 (Smart Split)
- **多素材识别**：如果输入包含多个独立的人物故事、多句不相关的名言、或多个明显的论证段落，请务必将它们**拆分**为多个独立的素材对象。
- **单素材保持**：如果输入是一篇连贯的文章或一个完整的故事，则作为一个素材处理。

## 技能 2: 深度清洗 (Deep Cleaning)
- **去噪**：去除“点击关注”、“广告”、“小编说”、“来源网络”、“页码”等无用信息。
- **修复**：修正 OCR 导致的错别字或断句。

## 技能 3: 标准化归类 (Standardization)
1. **类型 (type)**：只能从以下列表中选择 1 个：
   ["人物素材", "名言金句", "论证段", "开头段", "结尾段", "专业词汇", "范文"]

2. **核心主题 (themes)**：从以下 18 个核心主题中，选择 **1-3 个**最贴合的主题：
   ["青春奋斗", "家国情怀", "科技创新", "责任奉献", "苦难挫折", "文化传承", "榜样力量", "公平正义", "生态环保", "多元包容", "人性光辉", "网络时代", "自我认知", "人生理想", "工匠精神", "文化自信", "责任担当", "审美境界"]

3. **智能标签 (tags)**：基于内容生成 **0-5 个具体的关键词标签**，用于补充核心主题之外的信息（如具体人物名、修辞手法、情感基调等）。
   - 例如：“李白”、“比喻论证”、“细节描写”、“乐观豁达”。

## 限制
- **必须输出标准 JSON 数组格式** `[...]`。
- JSON 结构示例：
[
  {
    "type": "人物素材",
    "themes": ["家国情怀", "苦难挫折"], 
    "tags": ["苏轼", "黄州突围", "乐观心态"],
    "content": "内容..."
  }
]
"""

# 2. 解析点评 Prompt
PROMPT_ANALYZE = """
# 角色
你是一位精通高考作文评分标准的专业高中语文老师。

## 技能
### 技能1：作文素材点评
1. **分析素材类型**：判断素材属于记叙文、议论文、散文或综合类。
2. **内容评价**：分析优点（内容充实、立意深刻）和不足。
3. **适用文体**：点明素材最适配的作文类型并说明原因。

### 技能2：写作角度拆解
1. **多维度分析**：从“个人成长/社会现象/文化传承/时代精神/思辨关系”维度切入。
2. **角度具象化**：拆解个人视角、思辨视角或社会视角。
3. **论证逻辑提示**：说明每个角度的素材支撑点。

### 技能3：适用主题推荐
1. **直接/间接适用主题**：推荐高考高频主题。
2. **应用场景示例**：提供具体作文题的素材嵌入方法。

## 限制
- **字数控制与完整性**：在字数允许范围内（各部分200-500字），必须确保语句通顺、逻辑完整，严禁因字数限制而生硬切断。
- 输出格式严格使用【简评】【写作角度】【适用主题】三个模块。
"""

# 3. 仿写出题 Prompt
PROMPT_IMITATE = """
# 角色
你是一位专业的作文仿写指导老师。

## 前置校验 (Pre-check)
在执行技能前，请先检测用户输入的{{input}}是否具备“范文”的基本完整性：
1. **字数检测**：若输入内容过短（例如少于50字），不足以构成段落或篇章。
2. **逻辑检测**：若输入内容缺乏基本的逻辑结构。
**若满足以上任一条件，请直接回复：“检测到您输入的内容过短或逻辑不全，难以进行有效的仿写拆解。请上传完整的段落或范文。”**

## 技能
### 技能1：范文拆解分析
1. **主旨提炼**：总结核心主题。
2. **框架解构**：拆分结构。
3. **细节拆解**：识别论证方式和语言特色。

### 技能2：作文题目设计
设计3类仿写题目，要求主题关联、结构匹配。

### 技能3：段落仿写题生成
针对经典段落设计仿写任务（结构模仿、手法迁移）。

## 限制
- 输出时优先分点（标题+正文）。
"""

# ================= 功能函数 =================

def service_process_upload(text_content):
    print(f"🤖 [LLM Request] Model: {MODEL_NAME}, Content Length: {len(text_content)}")
    try:
        # 发送请求 (无 response_format，兼容性最好)
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": PROMPT_UPLOAD},
                {"role": "user", "content": text_content}
            ],
            temperature=0.2
        )
        result_str = response.choices[0].message.content
        print(f"📩 [LLM Response Received]: {len(result_str)} chars") 
        
        # === 🛡️ 强力清洗逻辑 (防止 AI 说废话) ===
        clean_str = result_str.strip()
        if "```" in clean_str:
            clean_str = clean_str.replace("```json", "").replace("```", "").strip()
        
        # 尝试提取 [ ... ]
        start_idx = clean_str.find("[")
        end_idx = clean_str.rfind("]")
        if start_idx != -1 and end_idx != -1:
            clean_str = clean_str[start_idx : end_idx+1]
            
        try:
            data = json.loads(clean_str)
        except json.JSONDecodeError:
            print(f"⚠️ JSON 解析失败，尝试修复: {clean_str[:50]}...")
            return [{
                "type": "未分类", "themes": [], "tags": ["格式错误"],
                "content": text_content
            }]
        
        if isinstance(data, list): return data
        if isinstance(data, dict):
            if "materials" in data and isinstance(data["materials"], list): return data["materials"]
            return [data]
        return []

    except Exception as e:
        print(f"❌ Upload Error: {e}")
        return [{
            "type": "未分类",
            "themes": [], 
            "tags": ["AI服务异常"], 
            "content": f"AI 连接错误: {str(e)}。原始内容: {text_content[:50]}..."
        }]

def service_analyze_material(material_content):
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": PROMPT_ANALYZE}, {"role": "user", "content": material_content}],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"解析服务暂时不可用: {str(e)}"

def service_generate_imitation(sample_text):
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": PROMPT_IMITATE}, {"role": "user", "content": sample_text}],
            temperature=0.8
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"仿写服务暂时不可用: {str(e)}"

def service_chat(user_message, system_prompt=None):
    try:
        msgs = [{"role": "user", "content": user_message}]
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})
            
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=msgs,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"对话服务暂时不可用: {str(e)}"