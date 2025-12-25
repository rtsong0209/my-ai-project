import sqlite3
import json
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_NAME = BASE_DIR / "materials.db"

def init_db():
    print(f"📦 [DB] 正在连接数据库: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            summary TEXT,
            tags TEXT,
            themes TEXT, 
            category TEXT,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_document(content, meta_data):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    create_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    category = meta_data.get("type", "未分类")
    summary = meta_data.get("summary")
    if not summary:
        summary = content[:50].replace("\n", " ") + "..."

    tags_str = json.dumps(meta_data.get("tags", []), ensure_ascii=False) 
    themes_str = json.dumps(meta_data.get("themes", []), ensure_ascii=False)

    cursor.execute('''
        INSERT INTO documents (content, summary, tags, themes, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (content, summary, tags_str, themes_str, category, create_time))
    
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return doc_id

def delete_document(doc_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
    conn.commit()
    conn.close()

def update_document(doc_id, content):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # 简单的更新内容，摘要也顺便更新一下
    summary = content[:50].replace("\n", " ") + "..."
    cursor.execute('UPDATE documents SET content = ?, summary = ? WHERE id = ?', (content, summary, doc_id))
    conn.commit()
    conn.close()

def get_document_by_id(doc_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        try: d["tags"] = json.loads(d["tags"])
        except: d["tags"] = []
        try: d["themes"] = json.loads(d["themes"])
        except: d["themes"] = []
        return d
    return None

# 👇👇👇 核心修改：增强的查询逻辑 👇👇👇
def get_documents(query=None, type=None, theme=None):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    sql = "SELECT * FROM documents WHERE 1=1"
    params = []
    
    # 1. 智能搜索 (匹配内容、摘要、标签、主题)
    if query:
        sql += " AND (content LIKE ? OR summary LIKE ? OR tags LIKE ? OR themes LIKE ?)"
        term = f"%{query}%"
        params.extend([term, term, term, term])
        
    # 2. 类型筛选 (左边栏-类型)
    if type and type != "全部素材":
        sql += " AND category = ?"
        params.append(type)
    
    # 3. 主题筛选 (左边栏-主题)
    if theme:
        # 因为 themes 是存成 JSON 字符串 ["A", "B"]，所以用 LIKE 模糊匹配
        sql += " AND themes LIKE ?"
        params.append(f"%{theme}%")
        
    sql += " ORDER BY id DESC"
    
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    
    documents = []
    for row in rows:
        d = dict(row)
        try: d["tags"] = json.loads(d["tags"])
        except: d["tags"] = []
        try: d["themes"] = json.loads(d["themes"])
        except: d["themes"] = []
        documents.append(d)
        
    conn.close()
    return documents