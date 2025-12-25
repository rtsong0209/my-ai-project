"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, MessageSquare, Search, Trash2, FileText, X } from "lucide-react";

// 定义接口
interface Material {
  id: number;
  content: string;
  type: string;
  themes: string[];
  tags: string[];
  date: string;
}

const THEME_LIST = [
  "青春奋斗", "家国情怀", "科技创新", "责任奉献", "苦难挫折", "文化传承", 
  "榜样力量", "公平正义", "生态环保", "多元包容", "人性光辉", "网络时代", 
  "自我认知", "人生理想", "工匠精神", "文化自信", "责任担当", "审美境界"
];

const TYPE_LIST = ["全部素材", "论证段", "开头段", "结尾段", "名言金句", "人物素材"];

export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState("全部素材");
  const [activeTheme, setActiveTheme] = useState(""); 
  const [inputText, setInputText] = useState("");

  // 🌟【关键修改】自动获取 API 地址
  // 如果 Vercel 里填了环境变量就用线上的，否则用本地的
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    fetchMaterials();
  }, [searchQuery, activeType, activeTheme]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (activeType && activeType !== "全部素材") params.append("type", activeType);
      if (activeTheme) params.append("theme", activeTheme); 

      // 🌟【关键修改】使用变量替换死地址
      const res = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (payload: File | string) => {
    setUploading(true);
    try {
      let res;
      if (payload instanceof File) {
        const formData = new FormData();
        formData.append("file", payload);
        // 🌟【关键修改】使用变量替换死地址
        res = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: formData });
      } else {
        // 🌟【关键修改】使用变量替换死地址
        res = await fetch(`${API_BASE_URL}/api/upload/text`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payload, type: "text" }),
        });
      }
      if (res.ok) { setShowUploadModal(false); setInputText(""); fetchMaterials(); }
    } catch (e) { alert("上传失败"); } finally { setUploading(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!confirm("确定要删除这条素材吗？")) return;
    // 🌟【关键修改】使用变量替换死地址
    await fetch(`${API_BASE_URL}/api/documents/${id}`, { method: "DELETE" });
    fetchMaterials();
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-800 font-sans">
      {/* === 左侧栏 (只保留筛选和上传) === */}
      <div className="w-64 bg-[#1e293b] text-white flex flex-col h-full shrink-0 shadow-xl z-20">
        <div className="p-6">
          {/* 🌟 这里的 Logo 删除了 */}
          
          <div className="mb-2">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">功能导航</h2>
          </div>

          <button 
            onClick={() => setShowUploadModal(true)} 
            className="w-full bg-[#ff6b35] hover:bg-[#e85a25] text-white py-3.5 rounded-xl transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 font-bold text-sm"
          >
            <Upload size={18} strokeWidth={2.5} /> 上传素材
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide pb-10 mt-2">
          {/* 类型筛选 */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 ml-2 tracking-widest">分类筛选</h3>
            <div className="space-y-1">
              {TYPE_LIST.map((type) => (
                <button 
                  key={type} 
                  onClick={() => setActiveType(type)} 
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                    activeType === type 
                      ? "bg-[#ff6b35] text-white font-bold shadow-md" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 主题筛选 */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 ml-2 tracking-widest">核心主题</h3>
            <div className="flex flex-wrap gap-2 px-1">
               {THEME_LIST.map((theme) => (
                <button 
                  key={theme} 
                  onClick={() => setActiveTheme(activeTheme === theme ? "" : theme)} 
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    activeTheme === theme 
                      ? "bg-[#ff6b35]/20 border-[#ff6b35] text-[#ff6b35] font-bold" 
                      : "border-transparent bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  #{theme}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === 主内容区 === */}
      <div className="flex-1 flex flex-col h-full bg-[#f3f4f6]">
        
        {/* 🌟 顶部搜索栏：现在这里包含 Logo + 搜索框 */}
        <div className="h-20 bg-white border-b border-gray-100 flex items-center px-8 justify-between shrink-0 z-10 shadow-sm">
          
          {/* 左侧组合：Logo + 搜索框 */}
          <div className="flex items-center gap-8 flex-1">
             {/* Logo 区域 */}
             <Link href="/" className="block cursor-pointer select-none shrink-0">
               <Image 
                 src="/logo.png" 
                 alt="智笔素材 Logo" 
                 width={140} 
                 height={45} 
                 className="object-contain" 
                 priority 
               />
             </Link>

             {/* 搜索框 */}
             <div className="relative w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#ff6b35] transition-colors w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="搜索素材内容、标签..." 
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-200 border border-transparent outline-none transition-all" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
             </div>
          </div>

          {/* 右侧：状态指示 */}
          <div className="flex items-center gap-2">
             <span className="flex h-2.5 w-2.5 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${loading ? 'bg-orange-500' : 'bg-green-500'}`}></span>
              </span>
             <span className="text-xs text-gray-400 font-medium">{loading ? "同步中..." : "系统就绪"}</span>
          </div>
        </div>

        {/* 卡片列表 */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((item) => (
              <Link key={item.id} href={`/document/${item.id}`} className="group block h-full">
                <div className="bg-white rounded-2xl p-7 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 h-72 flex flex-col relative border border-transparent hover:border-orange-100 group">
                  
                  <button 
                    onClick={(e) => handleDelete(e, item.id)} 
                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="删除素材"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex items-center justify-between mb-5">
                    <span className="px-3 py-1 bg-[#fff7ed] text-[#ff6b35] text-xs rounded-lg font-bold border border-orange-100 tracking-wide">
                      {item.type || "未分类"}
                    </span>
                    <span className="text-xs text-gray-300 font-mono tracking-tighter">{item.date}</span>
                  </div>

                  <div className="flex-1 mb-5 overflow-hidden">
                    <p className="text-gray-600 text-sm leading-relaxed text-justify line-clamp-5 font-sans">
                       {item.content || "（暂无内容预览，请点击查看详情）"}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4 border-t border-dashed border-gray-100">
                    {item.themes?.slice(0, 2).map((t, i) => (
                      <span key={`theme-${i}`} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium group-hover:bg-[#fff7ed] group-hover:text-[#ff6b35] transition-colors">
                        #{t}
                      </span>
                    ))}
                    {(!item.themes || item.themes.length < 2) && item.tags?.slice(0, 2).map((t, i) => (
                      <span key={`tag-${i}`} className="px-2.5 py-1 border border-gray-100 text-gray-400 rounded-md text-xs">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {!loading && materials.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
               <FileText size={64} strokeWidth={1} className="mb-4 text-gray-300"/>
               <p className="text-sm font-medium">暂无相关素材</p>
               <p className="text-xs mt-1">尝试上传新文件或调整筛选条件</p>
            </div>
          )}
        </div>
      </div>
      
      {/* === 上传 Modal === */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#1e293b]/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-[600px] p-8 shadow-2xl relative">
              <button onClick={() => setShowUploadModal(false)} className="absolute right-6 top-6 text-gray-400 hover:text-gray-800 transition"><X size={20}/></button>
              
              <h2 className="text-xl font-bold mb-8 text-gray-800 flex items-center gap-2">
                <Upload size={20} className="text-[#ff6b35]" />
                添加作文素材
              </h2>
              
              <div className="group border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-[#ff6b35] hover:bg-[#fff7ed] cursor-pointer relative transition-all duration-300">
                 <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files && handleUpload(e.target.files[0])} />
                 <div className="group-hover:scale-105 transition-transform duration-300">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 group-hover:bg-orange-100 group-hover:text-[#ff6b35] rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                       {uploading ? <div className="animate-spin text-2xl">⏳</div> : <Upload size={28} />}
                    </div>
                    <p className="text-gray-600 font-medium group-hover:text-[#ff6b35] transition-colors">点击上传或拖拽文件至此</p>
                    <p className="text-gray-400 text-xs mt-2">支持 PDF, DOCX, 图片 (自动 OCR), TXT</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 my-6 opacity-50">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-xs text-gray-400">或</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <div className="relative">
                <textarea 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-orange-200 p-4 rounded-xl h-32 focus:ring-4 focus:ring-orange-50 outline-none resize-none text-sm transition-all" 
                  placeholder="在此直接粘贴文本内容，或粘贴公众号/小红书链接..." 
                />
                <button 
                  onClick={() => handleUpload(inputText)} 
                  disabled={!inputText.trim() || uploading}
                  className="w-full bg-[#1e293b] text-white py-4 rounded-xl mt-4 font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                >
                  {uploading ? "AI 正在深度解析..." : "开始识别与导入"}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}