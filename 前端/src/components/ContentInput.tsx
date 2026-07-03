import { useState, useRef } from 'react';
import { FileText, Upload, Link2, Video, Send, ChevronDown, CheckCircle, X, File, Globe, Clock, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function ContentInput() {
  const { content, setContent, summaryType, setSummaryType, model, setModel, language, setLanguage, inputType, setInputType, isGenerating, customPrompt, setCustomPrompt } = useStore();
  const [isSummaryTypeOpen, setIsSummaryTypeOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 视频相关状态
  const [videoInputType, setVideoInputType] = useState<'file' | 'url'>('file');
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoSuccess, setVideoSuccess] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoFileSize, setVideoFileSize] = useState(0);
  const [videoProcessStage, setVideoProcessStage] = useState('');
  const [videoFps, setVideoFps] = useState(0.3);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const summaryTypes = ['标准摘要', '简短摘要', '详细摘要'];
  const models = ['DeepSeek', '豆包', '文心一言', 'Kimi', '千问'];
  const languages = ['中文', 'English'];

  const inputTypes = [
    { id: 'text', label: '文本输入', icon: FileText },
    { id: 'file', label: '文件上传', icon: Upload },
    { id: 'url', label: 'URL网址', icon: Link2 },
    { id: 'video', label: '视频上传', icon: Video },
  ];

  const parseUrl = async () => {
    if (!urlInput.trim()) {
      setUrlError('请输入URL地址');
      return;
    }

    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(urlInput)) {
      setUrlError('请输入有效的URL地址');
      return;
    }

    setIsParsingUrl(true);
    setUrlError('');

    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      });

      const result = await response.json();

      if (result.success) {
        setContent(result.content);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUrlError(result.error || '解析失败，请尝试其他URL');
      }
    } catch (error) {
      setUrlError('网络错误，请稍后重试');
      console.error('URL parse error:', error);
    } finally {
      setIsParsingUrl(false);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || '文件上传失败');
      }

      const result = await response.json();
      if (result.code === 0 && result.data?.content) {
        setContent(result.data.content);
        setUploadedFileName(file.name);
        setUploadSuccess(true);
        setShowPreview(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        throw new Error(result.message || '文件解析失败');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文件上传失败');
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validExtensions = ['.txt', '.md', '.docx'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setUploadError('不支持的文件格式，请上传 .txt, .md 或 .docx 文件');
        return;
      }
      await uploadFile(file);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.mp4', '.mov', '.avi'];

    if (!validExtensions.includes(ext)) {
      setVideoError('不支持的视频格式，请上传 MP4、MOV 或 AVI 文件');
      return;
    }

    if (file.size > 512 * 1024 * 1024) {
      setVideoError(`文件大小超过限制（最大512MB），当前文件大小: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    setVideoFileName(file.name);
    setVideoFileSize(file.size);
    setVideoError('');
    setVideoSuccess(false);
    setIsProcessingVideo(true);

    try {
      // 阶段1：上传文件
      setVideoProcessStage('正在上传视频...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fps', videoFps.toString());

      const uploadResponse = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.detail || uploadResult.message || '视频上传失败');
      }

      const fileId = uploadResult.file_id;

      // 阶段2：等待文件处理完成
      setVideoProcessStage('正在分析视频内容...');
      let maxWaitTime = 120; // 最多等待120秒
      let waitInterval = 3; // 每3秒检查一次

      while (maxWaitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitInterval * 1000));

        const statusResponse = await fetch('/api/video/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: fileId }),
        });

        const statusResult = await statusResponse.json();

        if (statusResult.success) {
          const status = statusResult.status;
          if (status === 'active' || status === 'processed') {
            break;
          }
          if (status === 'failed' || status === 'error') {
            throw new Error('视频预处理失败');
          }
        }

        maxWaitTime -= waitInterval;
      }

      if (maxWaitTime <= 0) {
        throw new Error('视频预处理超时，请尝试更短的视频');
      }

      // 阶段3：生成视频摘要
      setVideoProcessStage('正在生成摘要...');
      const summaryResponse = await fetch('/api/video/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          prompt: '完整分析视频内容，提取对话字幕和画面关键信息，输出结构化视频摘要，包括：1.关键事件时间线 2.主要人物 3.核心观点 4.重要台词',
        }),
      });

      const summaryResult = await summaryResponse.json();

      if (!summaryResult.success) {
        throw new Error(summaryResult.detail || summaryResult.message || '视频摘要生成失败');
      }

      setContent(summaryResult.summary);
      setVideoSuccess(true);
      setTimeout(() => setVideoSuccess(false), 3000);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('navigate-to-summary'));
        setTimeout(() => {
          window.dispatchEvent(new Event('generate-all'));
        }, 300);
      }, 500);

    } catch (error) {
      setVideoError(error instanceof Error ? error.message : '视频处理失败');
      console.error('Video processing error:', error);
    } finally {
      setIsProcessingVideo(false);
      setVideoProcessStage('');
    }
  };

  const processVideoUrl = async (targetUrl?: string) => {
    const urlToProcess = targetUrl || videoUrl.trim();
    if (!urlToProcess) {
      setVideoError('请输入视频URL地址');
      return;
    }

    setVideoError('');
    setVideoSuccess(false);
    setIsProcessingVideo(true);
    setVideoProcessStage('正在处理视频...');

    try {
      const response = await fetch('/api/video/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: urlToProcess,
          fps: videoFps,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (content.trim()) {
          setContent(content + '\n\n---视频摘要---\n\n' + result.content);
        } else {
          setContent(result.content);
        }
        setVideoSuccess(true);
        setTimeout(() => setVideoSuccess(false), 3000);
        
        setTimeout(() => {
          window.dispatchEvent(new Event('navigate-to-summary'));
          setTimeout(() => {
            window.dispatchEvent(new Event('generate-all'));
          }, 300);
        }, 500);
      } else {
        setVideoError(result.detail || result.message || '视频处理失败');
      }
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : '网络错误，请稍后重试');
      console.error('Video URL process error:', error);
    } finally {
      setIsProcessingVideo(false);
      setVideoProcessStage('');
    }
  };

  const handleGenerate = () => {
    if (content.trim()) {
      window.dispatchEvent(new CustomEvent('generate-all'));
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
              onClick={() => {
                setInputType(item.id);
                if (item.id === 'video') {
                  setModel('豆包');
                }
              }}
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
        <div className="mb-6">
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError('')} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>文件上传成功！内容已加载到文本框</span>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
              isDragOver
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-500'
            }`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md,.docx" />
            {isUploading ? (
              <>
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600 font-medium">正在上传解析...</p>
              </>
            ) : isDragOver ? (
              <>
                <File className="w-12 h-12 text-primary-500 mx-auto mb-3" />
                <p className="text-primary-600 font-medium">松开以上传文件</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">点击或拖拽文件到此处</p>
                <p className="text-gray-400 text-sm mt-1">支持 .txt, .md, .docx 格式</p>
              </>
            )}
          </div>

          {uploadedFileName && content && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <File className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{uploadedFileName}</span>
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  {showPreview ? '收起预览' : '展开预览'}
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-2">共 {content.length} 字符</div>
              {showPreview && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap break-all">{content}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {inputType === 'url' && (
        <div className="mb-6">
          {urlError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <span>{urlError}</span>
              <button onClick={() => setUrlError('')} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>URL解析成功！内容已加载</span>
            </div>
          )}

          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-primary-500" />
              <span className="text-gray-600 font-medium">输入网页URL地址</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parseUrl()}
                placeholder="https://example.com/news/article.html"
                className="flex-1 input-field"
              />
              <button
                onClick={parseUrl}
                disabled={isParsingUrl || !urlInput.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isParsingUrl ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    解析
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-3">支持解析新闻网站、博客文章等网页内容</p>
          </div>

          {content && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">解析内容预览</span>
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  {showPreview ? '收起预览' : '展开预览'}
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-2">共 {content.length} 字符</div>
              {showPreview && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap break-all">{content}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {inputType === 'video' && (
        <div className="mb-6">
          {videoError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <span>{videoError}</span>
              <button onClick={() => setVideoError('')} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {videoSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>视频处理成功！内容已追加到文本框</span>
            </div>
          )}

          {/* 视频输入类型切换 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setVideoInputType('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${videoInputType === 'file' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Upload className="w-5 h-5" />
              本地文件
            </button>
            <button
              onClick={() => setVideoInputType('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${videoInputType === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Link2 className="w-5 h-5" />
              视频URL
            </button>
          </div>

          {/* 抽帧频率设置 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              抽帧频率
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setVideoFps(0.3)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${videoFps === 0.3 ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 长视频 (0.3fps)</span>
              </button>
              <button
                onClick={() => setVideoFps(1)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${videoFps === 1 ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 普通视频 (1fps)</span>
              </button>
              <button
                onClick={() => setVideoFps(2.5)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${videoFps === 2.5 ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 动作视频 (2.5fps)</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">抽帧频率越高，分析越精细，但消耗的Token越多</p>
          </div>

          {/* 本地文件上传 */}
          {videoInputType === 'file' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isProcessingVideo ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-500'}`}
              onClick={() => !isProcessingVideo && videoFileInputRef.current?.click()}
            >
              <input
                ref={videoFileInputRef}
                type="file"
                className="hidden"
                accept=".mp4,.mov,.avi"
                onChange={handleVideoFileUpload}
              />
              {isProcessingVideo ? (
                <>
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{videoProcessStage || '正在处理...'}</p>
                </>
              ) : (
                <>
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">点击上传视频文件</p>
                  <p className="text-gray-400 text-sm mt-1">支持 MP4、MOV、AVI 格式，最大 512MB</p>
                </>
              )}
            </div>
          )}

          {/* 视频URL输入 */}
          {videoInputType === 'url' && (
            <div className="border-2 border-dashed rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Video className="w-6 h-6 text-primary-500" />
                <span className="text-gray-600 font-medium">输入视频网页URL地址</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processVideoUrl()}
                  placeholder="https://www.chinanews.com.cn/cj/shipin/cns-d/2026/07-02/news1060215.shtml"
                  className="flex-1 input-field"
                />
                <button
                  onClick={() => processVideoUrl()}
                  disabled={isProcessingVideo || !videoUrl.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingVideo ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      处理
                    </>
                  )}
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-3">支持新闻网站视频页面或直接视频链接（如.mp4），系统会自动提取视频并分析</p>
            </div>
          )}

          {/* 视频信息展示 */}
          {(videoFileName || videoUrl) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {videoFileName || videoUrl}
                  </span>
                </div>
              </div>
              {videoFileSize > 0 && (
                <div className="text-sm text-gray-500">
                  文件大小: {(videoFileSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>
          )}
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
      
      <textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="输入个性化要求（可选），例如：摘要要更简洁、标题要更吸引人..."
        className="input-field h-24 resize-none mb-6 text-gray-700 placeholder-gray-400"
      />

      <button
        onClick={handleGenerate}
        disabled={!content.trim() || isGenerating}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            正在生成中...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            一键生成
          </>
        )}
      </button>
    </div>
  );
}