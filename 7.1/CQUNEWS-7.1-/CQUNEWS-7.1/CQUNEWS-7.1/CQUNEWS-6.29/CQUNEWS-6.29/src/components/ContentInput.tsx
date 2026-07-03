import { useState, useRef } from 'react';
import { FileText, Upload, Mic, Video, Send, ChevronDown, X, Eye, File } from 'lucide-react';
import { useStore } from '@/store/useStore';
import mammoth from 'mammoth';

export function ContentInput() {
  const { content, setContent, summaryType, setSummaryType, model, setModel, language, setLanguage, inputType, setInputType, isGenerating, step } = useStore();
  const [isSummaryTypeOpen, setIsSummaryTypeOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summaryTypes = ['标准摘要', '简短摘要', '详细摘要'];
  const models = ['DeepSeek', '豆包', '文心一言', 'Kimi', '千问'];
  const languages = ['中文', 'English'];

  const inputTypes = [
    { id: 'text', label: '文本输入', icon: FileText },
    { id: 'file', label: '文件上传', icon: Upload },
    { id: 'voice', label: '语音上传', icon: Mic },
    { id: 'video', label: '视频上传', icon: Video },
  ];

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setContent(result.value);
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const text = await file.text();
        setContent(text);
      } else {
        alert(`不支持的文件格式: ${file.name}`);
        return;
      }
      
      setUploadedFile(file);
    } catch (error) {
      console.error('文件读取失败:', error);
      alert('文件读取失败，请尝试其他文件');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setShowFilePreview(false);
    setContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleGenerate = () => {
    if (content.trim()) {
      setLastGeneratedContent(content);
      window.dispatchEvent(new CustomEvent('generate-all'));
    }
  };

  const isRegenerate = step >= 5 && content.trim() === lastGeneratedContent;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-primary-600 rounded-full" />
        <h2 className="text-xl font-bold text-gray-800">内容输入</h2>
      </div>
      
      <div className="flex gap-2 mb-6">
        {inputTypes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setInputType(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                inputType === item.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>
      
      {inputType === 'text' && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请输入新闻内容..."
          className="input-field h-48 resize-none mb-6 text-gray-700 placeholder-gray-400"
        />
      )}
      
      {inputType === 'file' && (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors duration-200 cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : uploadedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-primary-500'
            }`}
            onClick={() => !isProcessing && !uploadedFile && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md,.docx" />
            {isProcessing ? (
              <>
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600 font-medium">正在读取文件...</p>
              </>
            ) : uploadedFile ? (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-600 font-medium">文件已上传</p>
                <p className="text-gray-500 text-sm mt-1">{uploadedFile.name}</p>
                <p className="text-gray-400 text-xs mt-1">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
              </>
            ) : (
              <>
                <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
                <p className={`font-medium ${isDragging ? 'text-primary-600' : 'text-gray-600'}`}>
                  {isDragging ? '松开以上传文件' : '点击或拖拽文件到此处'}
                </p>
                <p className="text-gray-400 text-sm mt-1">支持 .txt, .md, .docx 格式</p>
              </>
            )}
          </div>
          
          {uploadedFile && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <File className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">{(uploadedFile.size / 1024).toFixed(2)} KB · 已解析 {content.length} 字符</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilePreview(!showFilePreview)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showFilePreview ? '隐藏内容' : '预览内容'}
                  </button>
                  <button
                    onClick={clearUploadedFile}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    移除
                  </button>
                </div>
              </div>
              
              {showFilePreview && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">文件内容预览：</p>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{content.substring(0, 500)}{content.length > 500 ? '...' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {inputType === 'voice' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">语音上传功能开发中</p>
          <p className="text-gray-400 text-sm mt-1">敬请期待</p>
        </div>
      )}
      
      {inputType === 'video' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">视频上传功能开发中</p>
          <p className="text-gray-400 text-sm mt-1">敬请期待</p>
        </div>
      )}
      
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <button
            onClick={() => setIsSummaryTypeOpen(!isSummaryTypeOpen)}
            className="select-field flex items-center justify-between"
          >
            <span>{summaryType}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isSummaryTypeOpen ? 'rotate-180' : ''}`} />
          </button>
          {isSummaryTypeOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {summaryTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => { setSummaryType(type); setIsSummaryTypeOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors duration-200 ${summaryType === type ? 'text-primary-600 bg-primary-50' : 'text-gray-700'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative flex-1">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="select-field flex items-center justify-between"
          >
            <span>{model}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isModelOpen ? 'rotate-180' : ''}`} />
          </button>
          {isModelOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => { setModel(m); setIsModelOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors duration-200 ${model === m ? 'text-primary-600 bg-primary-50' : 'text-gray-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative flex-1">
          <button
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            className="select-field flex items-center justify-between"
          >
            <span>{language}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isLanguageOpen ? 'rotate-180' : ''}`} />
          </button>
          {isLanguageOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setIsLanguageOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors duration-200 ${language === lang ? 'text-primary-600 bg-primary-50' : 'text-gray-700'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={!content.trim() || isGenerating}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {isRegenerate ? '正在重新生成...' : '正在生成中...'}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            {isRegenerate ? '重新生成' : '一键生成'}
          </>
        )}
      </button>
    </div>
  );
}