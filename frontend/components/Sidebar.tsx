// frontend/components/Sidebar.tsx
import { Plus, Search, Layers, Quote, User, BookOpen } from 'lucide-react';

interface SidebarProps {
  onUploadClick?: () => void;
  totalCount?: number;
  onSearch?: (query: string) => void;      // 新增
  onFilterChange?: (type: string) => void; // 新增
  currentFilter?: string;                  // 新增
}

export function Sidebar({ onUploadClick, totalCount = 0, onSearch, onFilterChange, currentFilter = "全部素材" }: SidebarProps) {
  
  // 定义左侧有哪些分类
  const categories = [
    { name: "全部素材", icon: Layers },
    { name: "名言金句", icon: Quote },
    { name: "人物素材", icon: User },
    { name: "论证段", icon: BookOpen },
    { name: "开头段", icon: FileText }, // 对应 Prompt 里的分类
  ];

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 p-6 flex flex-col fixed left-0 top-0 z-20">
      <div className="mb-8">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm">W</div>
          素材库
        </h1>
      </div>

      <button onClick={onUploadClick} className="w-full bg-black text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 mb-6 cursor-pointer">
        <Plus size={18} />
        上传素材
      </button>

      {/* 搜索框：绑定 onChange */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="搜索素材..." 
          onChange={(e) => onSearch?.(e.target.value)} 
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-bold text-gray-400 mb-2 px-2">类型筛选</p>
        
        {/* 循环渲染分类按钮 */}
        {categories.map((cat) => (
          <div 
            key={cat.name}
            onClick={() => onFilterChange?.(cat.name)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer font-medium text-sm transition-colors ${
              currentFilter === cat.name 
                ? 'bg-purple-100 text-purple-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {/* 这里的 icon 有点小问题，需要动态组件，为了简便我们暂时都用 Layers 或者 cat.icon */}
            <cat.icon size={16} />
            <span>{cat.name}</span>
            
            {/* 只有全部素材显示总数 */}
            {cat.name === "全部素材" && totalCount > 0 && (
              <span className="ml-auto text-xs bg-white/50 px-1.5 rounded text-purple-700 border border-purple-200">
                {totalCount}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 补充：为了解决 icon 报错，如果你没有引入 FileText 等，请在顶部 import 加上
import { FileText } from 'lucide-react';