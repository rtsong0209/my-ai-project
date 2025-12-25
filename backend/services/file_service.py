from fastapi import UploadFile
from docx import Document
import io
import requests
from bs4 import BeautifulSoup
import pdfplumber  # ✅ 推荐使用这个处理 PDF

# 👇 核心改动：把 pytesseract 换成 rapidocr
# 尝试导入 RapidOCR (Python 最好用的开源 OCR，无需安装系统软件)
try:
    from rapidocr_onnxruntime import RapidOCR
    # 初始化引擎 (第一次运行会自动下载模型，约 10MB)
    ocr_engine = RapidOCR()
    OCR_AVAILABLE = True
    print("✅ [OCR] RapidOCR 引擎加载成功！(已启用中文增强识别)")
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️ 未检测到 rapidocr_onnxruntime，请在终端运行: pip install rapidocr_onnxruntime")

async def read_file_content(file: UploadFile) -> str:
    content = ""
    filename = file.filename.lower()
    
    print(f"📂 正在解析文件: {filename}")

    try:
        file_bytes = await file.read()
        file_stream = io.BytesIO(file_bytes)

        # 1. 处理 PDF (✅ 优化：改用 pdfplumber，中文效果更好)
        if filename.endswith(".pdf"):
            # pdfplumber 需要读取流
            with pdfplumber.open(file_stream) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
        
        # 2. 处理 Word 文档
        elif filename.endswith(".docx"):
            doc = Document(file_stream)
            for para in doc.paragraphs:
                content += para.text + "\n"
        
        # 3. 处理图片 (RapidOCR)
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            if OCR_AVAILABLE:
                try:
                    # RapidOCR 可以直接接收二进制数据 (bytes)
                    result, _ = ocr_engine(file_bytes)
                    
                    if result:
                        # result 的格式是 [[坐标], 文本, 置信度]
                        text_list = [item[1] for item in result]
                        content = "\n".join(text_list)
                        print(f"✅ 图片识别成功，共提取 {len(content)} 个字符")
                    else:
                        content = "【未能识别出文字，图片可能太模糊或没有文字】"
                except Exception as e:
                    print(f"❌ OCR 识别过程出错: {e}")
                    content = "【图片内容识别系统出错】"
            else:
                content = "【系统未安装 RapidOCR 库，无法解析图片，请检查 pip 安装】"

        # 4. 其他文件当纯文本处理
        else:
            try:
                content = file_bytes.decode("utf-8")
            except:
                content = file_bytes.decode("gbk", errors="ignore")

    except Exception as e:
        print(f"❌ 文件解析出错: {e}")
        return None
    
    # ❌ 移除 return content[:5000] 限制，确保返回全文
    return content

def read_url_content(url: str) -> str:
    # 针对小红书链接的特殊提示
    if "xiaohongshu" in url:
        return f"检测到小红书链接：{url}\n由于小红书反爬严格，建议您直接【截图】并使用图片上传功能，或直接复制文字内容粘贴。"

    # 其他网页的通用爬取
    print(f"🔗 [Crawler] 正在抓取: {url}")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.extract()
            
        text = soup.get_text()
        # ❌ 移除截断，返回全文
        return text.strip()
    except Exception as e:
        return f"无法抓取该网页，建议复制内容上传。链接: {url}"