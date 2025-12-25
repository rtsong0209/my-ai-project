"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Bot, User, BookOpen, PenTool, MessageCircle, Edit2, Save, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// === 1. 预设问题配置 ===
const QUESTIONS_MAP: Record<string, string[]> = {
  analyze: [
    "分析这段素材的论证逻辑",
    "这段素材适合用在什么主题的作文里？",
    "帮我提炼3个适用的人物精神关键词",
    "指出这段文字在修辞上的亮点"
  ],
  rewrite: [
    "把这段话改写成排比句，增强气势",
    "模仿这个风格写一段关于‘坚持’的开头",
    "用这段素材作为论据，写一个论证段落",
    "基于此素材出两道作文题目"
  ],
  general: [
    "帮我把这段素材缩写到100字以内",
    "这段素材有没有相关的反面例子？",
    "翻译成英文"
  ]
};

// 🌟 样式常量：橙色主题 V2
const BTN_ORANGE = "bg-[#ff6b35] hover:bg-[#e85a25] text-white shadow-md transition-all active:scale-95";
const BTN_GHOST = "bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-all";
const TAG_THEME = "bg-[#e0e7ff] text-[#4338ca]"; // 蓝色系，用于 Theme
const TAG_NORMAL = "bg-gray-100 text-gray-500";   // 灰色系，用于 Tags

interface Message {
  role: "user" | "assistant";
  content: string;
}

// 定义聊天历史记录的结构
type ChatHistory = {
  general: Message[];
  analyze: Message[];
  rewrite: Message[];
};

export default function DocumentDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 编辑状态管理
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 聊天状态
  const [activeTab, setActiveTab] = useState<"general" | "analyze" | "rewrite">("general");
  const [chatHistory, setChatHistory] = useState<ChatHistory>({
    general: [],
    analyze: [],
    rewrite: []
  });
  
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🌟【关键修改】自动获取 API 地址
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // 1. 获取文章详情
  useEffect(() => {
    if (!id) return;
    // 🌟【关键修改】使用变量替换死地址
    fetch(`${API_BASE_URL}/api/documents/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not Found");
        return res.json();
      })
      .then((data) => {
        setDoc(data);
        setEditContent(data.content || ""); 
      })
      .catch((e) => console.error("加载失败", e))
      .finally(() => setLoading(false));
  }, [id, API_BASE_URL]); // 添加 API_BASE_URL 依赖

  // 2. 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeTab, chatLoading]);

  // 3. 切换 Tab (保留历史记录)
  const handleTabChange = (tab: "general" | "analyze" | "rewrite") => {
    setActiveTab(tab);
  };

  // 保存修改
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 🌟【关键修改】使用变量替换死地址
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...doc, content: editContent }),
      });
      
      if (res.ok) {
        setDoc({ ...doc, content: editContent }); 
        setIsEditing(false); 
      } else {
        alert("保存失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setIsSaving(false);
    }
  };

  // 4. 发送消息
  const handleSend = async (text: string) => {
    if (!text.trim() || chatLoading) return;

    const userMsg: Message = { role: "user", content: text };
    
    // 更新历史
    setChatHistory(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], userMsg]
    }));
    
    setInput("");
    setChatLoading(true);

    try {
      // 🌟【关键修改】使用变量替换死地址
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: id,
          message: text,
          mode: activeTab
        }),
      });
      
      const data = await res.json();
      const botMsg: Message = { role: "assistant", content: data.response };

      setChatHistory(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], botMsg]
      }));

    } catch (e) {
      setChatHistory(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: "assistant", content: "网络错误，请检查后端。" }]
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const currentMessages = chatHistory[activeTab];

  if (loading) return <div className="p-20 text-center text-gray-500">正在加载素材...</div>;
  if (!doc) return <div className="p-20 text-center text-gray-500">文章不存在</div>;

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden text-gray-800 font-sans">
      
      {/* === 左侧：阅读/编辑区 (V2 布局) === */}
      <div className="w-1/2 flex flex-col p-6 pr-3 h-full">
        
        {/* 顶部按钮栏 */}
        <div className="flex justify-between mb-4 shrink-0">
          <button 
            onClick={() => router.back()} 
            className={`${BTN_ORANGE} px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm`}
          >
            <ArrowLeft size={18} /> 返回列表
          </button>

          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className={`${BTN_ORANGE} px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm`}
            >
              <Edit2 size={18} /> 编辑全文
            </button>
          ) : (
            <div className="flex gap-3 animate-in fade-in zoom-in duration-200">
              <button 
                onClick={() => { setIsEditing(false); setEditContent(doc.content); }} 
                className="bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-300 transition"
              >
                <X size={18} /> 取消
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`${BTN_ORANGE} px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm disabled:opacity-50`}
              >
                <Save size={18} /> {isSaving ? "保存中..." : "保存修改"}
              </button>
            </div>
          )}
        </div>

        {/* 卡片主体 */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm p-10 overflow-y-auto scrollbar-hide flex flex-col">
           {/* 🌟 1. 类型 Badge (移到顶部) */}
           <div className="mb-8">
             <span className="bg-orange-50 text-[#ff6b35] px-4 py-2 rounded-xl text-sm font-bold tracking-wide border border-orange-100">
               {doc.type || "论证段"}
             </span>
           </div>
            
           {/* 🌟 2. 正文内容 */}
           <div className="flex-1">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full p-6 border-2 border-orange-100 rounded-2xl focus:border-orange-400 outline-none text-lg leading-loose resize-none font-serif text-gray-800 bg-white"
                placeholder="在此编辑素材内容..."
                autoFocus
              />
            ) : (
              <div className="whitespace-pre-wrap leading-[2.2] text-lg text-gray-800 font-serif text-justify tracking-wide">
                {doc.content}
              </div>
            )}
           </div>

            {/* 🌟 3. 底部信息：Themes + Tags + Date */}
            <div className="mt-10 pt-6 border-t border-dashed border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {/* Themes (蓝色) */}
                {doc.themes?.map((t: string, i: number) => (
                  <span key={`theme-${i}`} className={`${TAG_THEME} px-3 py-1.5 rounded-lg text-xs font-bold`}>#{t}</span>
                ))}
                {/* Tags (灰色) */}
                {doc.tags?.map((tag: string, i: number) => (
                  <span key={`tag-${i}`} className={`${TAG_NORMAL} px-3 py-1.5 rounded-lg text-xs font-medium`}>#{tag}</span>
                ))}
              </div>
              <span className="text-gray-400 text-sm font-mono">{doc.date}</span>
            </div>
        </div>
      </div>

      {/* === 右侧：AI 交互区 (V2 布局) === */}
      <div className="w-1/2 flex flex-col p-6 pl-3 h-full">
        
        <div className="flex-1 bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
          
          {/* 🌟 顶部 Tabs (V2 样式：文字标签) */}
          <div className="flex border-b border-gray-100">
            {[
              { id: "general", label: "自由对话" },
              { id: "analyze", label: "深度解析" },
              { id: "rewrite", label: "仿写指导" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 py-5 text-sm font-bold tracking-wide transition-all relative ${
                  activeTab === tab.id
                    ? "text-[#ff6b35] bg-orange-50/30"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {/* 底部指示条 */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#ff6b35]"></div>
                )}
              </button>
            ))}
          </div>

          {/* 聊天记录 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[#fafafa]">
            {/* 欢迎语 */}
            {currentMessages.length === 0 && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0 shadow-lg text-white">
                  <Bot size={20} />
                </div>
                <div className="space-y-4 max-w-[90%]">
                  <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-sm text-gray-700 leading-relaxed border border-gray-100">
                    <p className="font-bold text-lg text-gray-900 mb-2">你好！我是你的 AI 助教。</p>
                    <p className="text-sm text-gray-500">
                      当前模式：<span className="text-[#ff6b35] font-bold">
                        {activeTab === "analyze" && "深度解析"}
                        {activeTab === "rewrite" && "仿写指导"}
                        {activeTab === "general" && "自由对话"}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {QUESTIONS_MAP[activeTab].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q)}
                        className={`${BTN_GHOST} px-3 py-1.5 rounded-lg text-xs hover:shadow-sm active:scale-95`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {currentMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white shadow-md ${
                  msg.role === "user" ? "bg-black" : "bg-[#1e293b]"
                }`}>
                  {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${
                  msg.role === "user" 
                    ? "bg-black text-white rounded-tr-none" 
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}>
                  {msg.role === "user" ? (
                     msg.content 
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:font-bold prose-strong:text-[#ff6b35]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex gap-3 ml-12 items-center">
                 <div className="flex space-x-1">
                   <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-100"></span>
                   <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-200"></span>
                 </div>
                 <span className="text-xs text-gray-400">AI 正在思考...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 🌟 底部交互区：输入框 + 3 大按钮切换 (V2 布局) */}
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="relative mb-4 group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                placeholder={`在【${activeTab === 'general' ? '自由对话' : activeTab === 'analyze' ? '深度解析' : '仿写指导'}】模式下提问...`}
                className="w-full pl-5 pr-12 py-3.5 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all text-sm border border-transparent focus:border-orange-200"
                disabled={chatLoading}
              />
              <button 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || chatLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#1e293b] text-white rounded-lg hover:bg-black disabled:opacity-30 disabled:hover:bg-[#1e293b] transition"
              >
                <Send size={16} />
              </button>
            </div>

            {/* 3个大按钮 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "general", label: "自由对话", icon: MessageCircle },
                { id: "analyze", label: "深度解析", icon: BookOpen },
                { id: "rewrite", label: "仿写指导", icon: PenTool },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-[#ff6b35] text-white shadow-lg shadow-orange-200 -translate-y-1"
                      : "bg-[#fff7ed] text-[#ff6b35] hover:bg-orange-100"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}