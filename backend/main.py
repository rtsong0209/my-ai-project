# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

# 引入服务
from services.llm_service import (
    service_process_upload, 
    service_analyze_material, 
    service_generate_imitation,
    service_chat
)
# 引入刚才修改过的强力 file_service
from services.file_service import read_file_content, read_url_content

from database.db_manager import (
    init_db, 
    save_document, 
    delete_document, 
    update_document, 
    get_documents, 
    get_document_by_id
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 请求体定义 ===
class TextRequest(BaseModel):
    content: str 

class ChatRequest(BaseModel):
    doc_id: int
    message: str = None      
    instruction: str = None
    mode: str = "general"

class TextUploadRequest(BaseModel):
    text: str   
    type: str = "text" 

class UpdateRequest(BaseModel):
    content: str

# ================= 1. 上传接口群 =================

# 1.1 文件上传 
@app.post("/api/upload")
async def upload_file_endpoint(file: UploadFile = File(...)):
    print(f"📥 [文件上传] 收到: {file.filename}")
    
    # 1. 读取文件 (file_service 已去掉 5000 字限制)
    content = await read_file_content(file)
    if not content: 
        return {"status": "error", "message": "解析失败或内容为空"}
    
    # 2. 调用 AI 处理
    # ❌ 核心修改：去掉 [:4000] 限制！传全文给 AI 进行处理
    # 注意：如果文章极长(如几万字)，建议在 service_process_upload 内部做分段，而不是在这里截断
    ai_results = service_process_upload(content)
    
    saved_ids = []
    for item in ai_results:
        # 过滤太短的无效内容
        if len(item.get("content", "")) < 5: continue
        
        # 保存到数据库
        doc_id = save_document(item["content"], item)
        saved_ids.append(doc_id)
    
    return {"status": "success", "ids": saved_ids, "count": len(saved_ids)}

# 1.2 文本/链接上传
@app.post("/api/upload/text")
async def upload_text_endpoint(request: TextUploadRequest):
    content = request.text
    
    # 如果是链接，进行爬取
    if request.type == "link" or (content.startswith("http") and len(content) < 500):
        crawled = read_url_content(content)
        if crawled:
            content = crawled

    # ❌ 核心修改：去掉 [:4000] 限制，确保长文也能完整保存
    ai_results = service_process_upload(content)
    
    saved_ids = []
    for item in ai_results:
        if len(item.get("content", "")) < 5: continue
        doc_id = save_document(item["content"], item)
        saved_ids.append(doc_id)
    
    return {"status": "success", "ids": saved_ids, "count": len(saved_ids)}


# ================= 2. 详情页 AI 互动接口 =================

@app.post("/api/material/analyze")
async def analyze_material_endpoint(request: TextRequest):
    analysis_text = service_analyze_material(request.content)
    return {"analysis": analysis_text}

@app.post("/api/material/imitate")
async def imitate_material_endpoint(request: TextRequest):
    imitation_result = service_generate_imitation(request.content)
    return {"tasks": imitation_result}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    user_msg = request.instruction or request.message
    
    print(f"💬 [Chat] 用户提问: {user_msg} | 模式: {request.mode} | 文档ID: {request.doc_id}")
    
    if not user_msg:
        raise HTTPException(status_code=422, detail="内容不能为空")

    doc = get_document_by_id(request.doc_id)
    if not doc:
        return {"response": "抱歉，找不到当前正在阅读的素材，无法回答。"}
    
    doc_content = doc['content']
    
    full_prompt = f"""
    【背景信息】
    用户正在阅读一篇作文素材，内容如下：
    ===
    {doc_content[:5000]}  # 这里可以适当截断作为 Context，防止超过 LLM 窗口
    ===
    
    【用户当前模式】
    {request.mode} (general=自由对话, analyze=解析, rewrite=仿写)

    【用户指令】
    {user_msg}
    
    请根据素材内容执行用户的指令。
    """
    
    ai_reply = service_chat(full_prompt)
    return {"response": ai_reply}


# ================= 3. 素材管理接口 (CRUD) =================

@app.get("/api/documents")
def get_documents_endpoint(query: str = None, type: str = None, theme: str = None):
    # 获取列表
    docs = get_documents(query=query, type=type, theme=theme)
    
    formatted_docs = []
    for d in docs:
        formatted_docs.append({
            "id": d["id"],
            # 首页卡片不再显示 Title，显示内容摘要
            "title": d["summary"][:15] + "..." if d["summary"] else "无标题", 
            
            # ✅ 对应前端 doc.type
            "type": d["category"], 
            
            # ✅ 对应前端 doc.themes (确保这里返回的是列表)
            "themes": d["themes"] if d["themes"] else [],
            
            # ✅ 核心修改：首页现在显示正文预览，所以这里返回 content，而不是 summary
            "content": d["content"], 
            
            "tags": d["tags"],
            "date": d["created_at"].split(" ")[0]
        })
    return formatted_docs

@app.get("/api/documents/{doc_id}")
def get_single_document_endpoint(doc_id: int):
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文章不存在")
    
    # ✅ 构造符合前端详情页的数据结构
    return {
        "id": doc["id"],
        "title": doc["summary"][:20] + "..." if doc["summary"] else "无标题",
        "content": doc["content"],
        "tags": doc["tags"],
        
        # ✅ 关键：前端需要 themes 和 type 字段进行回显
        "themes": doc["themes"] if doc["themes"] else [],
        "type": doc["category"], # 前端叫 type，数据库叫 category，这里做映射
        
        "date": doc["created_at"].split(" ")[0]
    }

@app.delete("/api/documents/{doc_id}")
def delete_doc_endpoint(doc_id: int):
    delete_document(doc_id)
    return {"status": "success"}

# 🌟 必须保留这个 PUT 接口，否则详情页无法保存修改
@app.put("/api/documents/{doc_id}")
def update_doc_endpoint(doc_id: int, request: UpdateRequest):
    update_document(doc_id, request.content)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)