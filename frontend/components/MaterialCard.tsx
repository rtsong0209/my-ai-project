// frontend/components/MaterialCard.tsx
"use client";

import { useRouter } from 'next/navigation';
import { FileText, Trash2, Edit } from 'lucide-react';

interface MaterialCardProps {
  data: any;
  onDelete?: (id: number) => void; // 新增：删除回调
}

export function MaterialCard({ data, onDelete }: MaterialCardProps) {
  const router = useRouter();

  // 处理删除点击
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // ✋ 阻止冒泡：防止触发卡片的跳转点击
    if (confirm("确定要删除这条素材吗？")) {
      onDelete?.(data.id);
    }
  };

  // 处理编辑点击
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // ✋ 阻止冒泡
    alert("请进入详情页进行深度编辑");
  };

  return (
    <div 
      // 整个卡片可点击跳转
      onClick={() => router.push(`/material/${data.id}`)}
      className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer relative h-[280px] flex flex-col"
    >
      {/* 顶部标签行 */}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs px-2 py-1 rounded-md font-bold ${
           data.type === '名言金句' ? 'bg-yellow-100 text-yellow-700' :
           data.type === '人物素材' ? 'bg-blue-100 text-blue-700' :
           'bg-purple-100 text-purple-700'
        }`}>
          {data.type}
        </span>
        
        {/* 操作按钮组 (默认隐藏，鼠标悬停时显示) */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleEdit} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <Edit size={14} />
          </button>
          <button onClick={handleDelete} className="p-1.5 hover:bg-red-50 rounded-full text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 标题 */}
      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1">{data.title}</h3>

      {/* 内容摘要 */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-4 flex-1">
        {data.content}
      </p>

      {/* 底部信息 */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <div className="flex gap-2 overflow-hidden">
          {data.tags.slice(0, 2).map((tag: string) => (
            <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded"># {tag}</span>
          ))}
        </div>
        <div className="flex items-center text-xs text-gray-300 gap-1 flex-shrink-0">
          <FileText size={12} />
          <span>{data.date}</span>
        </div>
      </div>
    </div>
  );
}