// frontend/components/UploadModal.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void; // 上传成功后的回调（比如刷新列表）
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [textInput, setTextInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // === 核心逻辑 1: 处理文件上传 ===
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.status === "success") {
        alert("文件上传成功！AI正在解析...");
        onUploadSuccess();
        onClose();
      } else {
        alert("上传失败: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("上传出错，请检查后端连接");
    } finally {
      setIsLoading(false);
    }
  };

  // === 核心逻辑 2: 处理文本/链接上传 ===
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    setIsLoading(true);
    // 简单的判断：如果包含 http 视为链接，否则视为纯文本
    const isLink = textInput.trim().startsWith("http");
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textInput,
          type: isLink ? "link" : "text"
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert(isLink ? "链接抓取成功！" : "文本保存成功！");
        setTextInput(""); // 清空输入
        onUploadSuccess();
        onClose();
      } else {
        alert("处理失败: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("提交出错，请检查后端连接");
    } finally {
      setIsLoading(false);
    }
  };

  // === 辅助逻辑: 拖拽事件 ===
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">添加作文素材</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 区域 1: 文件拖拽区 (模仿截图样式) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
            }`}
          >
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <Upload className="text-blue-600" size={24} />
            </div>
            <p className="text-gray-500 mb-4">拖拽文件到此处或点击上传</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "上传处理中..." : "选择文件"}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              支持格式：PDF, DOCX, TXT (最大 10MB)
            </p>
          </div>

          {/* 分割线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或</span>
            </div>
          </div>

          {/* 区域 2: 文本/链接输入区 (模仿截图下半部分) */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">直接输入文字内容 / 粘贴链接</h4>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="在此输入作文素材内容，或者粘贴公众号/新闻文章链接..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleTextSubmit}
                disabled={isLoading || !textInput.trim()}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {isLoading ? "AI 解析中..." : "确认添加"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}