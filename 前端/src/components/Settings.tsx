import { useState, useEffect, useRef, Fragment } from 'react';
import { useStore } from '@/store/useStore';
import { userApi } from '@/lib/api';
import { getTranslation } from '@/lib/i18n';
import { User, Bell, Shield, Palette, Globe, Save, RefreshCw, HelpCircle, ChevronRight, Info, Sun, Moon, Monitor, AlertCircle, CheckCircle, Upload, Eye, EyeOff, Volume2, Mail, Crown, Send, MessageSquare } from 'lucide-react';

const navigateToAdminLogin = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login?mode=admin';
};

interface SettingSection {
  id: string;
  titleKey: string;
  icon: typeof User;
  descriptionKey: string;
}

const sections: SettingSection[] = [
  { id: 'profile', titleKey: 'profile', icon: User, descriptionKey: 'manage_profile' },
  { id: 'security', titleKey: 'security', icon: Shield, descriptionKey: 'manage_security' },
  { id: 'appearance', titleKey: 'appearance', icon: Palette, descriptionKey: 'customize_theme' },
  { id: 'notification', titleKey: 'notification', icon: Bell, descriptionKey: 'configure_notifications' },
  { id: 'language', titleKey: 'language', icon: Globe, descriptionKey: 'select_language' },
];

type ThemeType = 'light' | 'dark' | 'system';

export function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    settings, 
    setTheme, 
    setFontSize, 
    setLanguageSetting, 
    setEmailNotification, 
    setSoundNotification, 
    setQualityNotification, 
    saveSettings,
    loadSettings,
    settingsLoading,
    settingsError,
    currentUser,
    updateUserInfo,
    updateAvatar,
    loadUserInfo,
  } = useStore();

  useEffect(() => {
    loadSettings();
    loadUserInfo();
  }, [loadSettings, loadUserInfo]);

  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  const t = (key: string) => getTranslation(key, settings.language);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      if (activeSection === 'profile') {
        const success = await updateUserInfo({ email, bio });
        if (success) {
          setSaveStatus('success');
          setSaveMessage(t('save_success'));
        } else {
          setSaveStatus('error');
          setSaveMessage(t('save_failed'));
        }
      } else {
        const success = await saveSettings();
        if (success) {
          setSaveStatus('success');
          setSaveMessage(t('save_success'));
        } else {
          setSaveStatus('error');
          setSaveMessage(t('save_failed'));
        }
      }
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || '保存失败，请检查网络连接');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus('error');
      setSaveMessage('图片大小不能超过2MB');
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const success = await updateAvatar(base64Data);
        if (success) {
          setSaveStatus('success');
          setSaveMessage('头像上传成功');
        } else {
          setSaveStatus('error');
          setSaveMessage('头像上传失败');
        }
      } catch (err: any) {
        setSaveStatus('error');
        setSaveMessage(err.message || '头像上传失败');
      }
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('fill_in_all_fields'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwords_do_not_match'));
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError(t('password_min_6_chars'));
      return;
    }
    
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasLetter) {
      setPasswordError(t('require_letter'));
      return;
    }
    
    if (!hasNumber) {
      setPasswordError(t('require_number'));
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/settings/security/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (data.code === 0) {
        setSaveStatus('success');
        setSaveMessage(t('password_changed_success'));
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.message || '密码修改失败');
      }
    } catch (err: any) {
      setPasswordError(err.message || '密码修改失败，请检查网络连接');
    } finally {
      setIsChangingPassword(false);
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      setSaveStatus('error');
      setSaveMessage(t('enter_feedback'));
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await userApi.submitFeedback(feedbackContent.trim(), feedbackContact.trim() || undefined);
      setSaveStatus('success');
      setSaveMessage(t('feedback_submitted'));
      setFeedbackContent('');
      setFeedbackContact('');
      setShowFeedbackModal(false);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || '反馈提交失败');
    } finally {
      setIsSubmittingFeedback(false);
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    }
  };

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer" 
      />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  );

  const ThemeButton = ({ theme, currentTheme, onSelect }: { theme: ThemeType; currentTheme: ThemeType; onSelect: (theme: ThemeType) => void }) => {
    const isActive = currentTheme === theme;
    const icons: Record<ThemeType, typeof Sun> = {
      light: Sun,
      dark: Moon,
      system: Monitor,
    };
    const Icon = icons[theme];
    const labels: Record<ThemeType, string> = {
      light: t('light_mode'),
      dark: t('dark_mode'),
      system: t('system_mode'),
    };

    const handleClick = () => {
      onSelect(theme);
      const body = document.body;
      body.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(systemDark ? 'dark' : 'light');
      } else {
        body.classList.add(theme);
      }
    };

    return (
      <button
        onClick={handleClick}
        className={`flex-1 p-4 rounded-lg text-center transition-all duration-300 ease-in-out ${
          isActive
            ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md'
            : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
        }`}
      >
        <Icon className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${isActive ? 'text-primary-600 scale-110' : 'text-gray-400'}`} />
        <span className={`font-medium transition-colors duration-300 ${isActive ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
          {labels[theme]}
        </span>
      </button>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={t('avatar')} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 active:bg-primary-800 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{currentUser?.username || t('user')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">支持 JPG、PNG 格式，大小不超过 2MB</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary mt-3"
                >
                  {t('change_avatar')}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('username')}</label>
                <input 
                  type="text" 
                  defaultValue={currentUser?.username || ''} 
                  className="input-field" 
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email')}</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field" 
                  placeholder={t('enter_email')}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('bio')}</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field h-24 resize-none" 
                placeholder={t('introduce_yourself')} 
              />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">{t('change_password')}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('old_password')}</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder={t('enter_old_password')} 
                      className="input-field pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('new_password')}</label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('enter_new_password')} 
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('confirm_password')}</label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('reenter_new_password')} 
                    className="input-field" 
                  />
                </div>
              </div>
              
              {passwordError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-200">{t('password_requirements')}</h5>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                      {t('min_6_chars')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                      {t('require_letter')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                      {t('require_number')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? t('changing') : t('confirm_change_password')}
            </button>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">{t('theme_mode')}</h4>
              <div className="flex gap-4">
                <ThemeButton 
                  theme="light" 
                  currentTheme={settings.theme} 
                  onSelect={setTheme} 
                />
                <ThemeButton 
                  theme="dark" 
                  currentTheme={settings.theme} 
                  onSelect={setTheme} 
                />
                <ThemeButton 
                  theme="system" 
                  currentTheme={settings.theme} 
                  onSelect={setTheme} 
                />
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">{t('font_size')}</h4>
              <input 
                type="range" 
                min="12" 
                max="18" 
                value={settings.fontSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setFontSize(newSize);
                  document.documentElement.style.fontSize = `${newSize}px`;
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-600 bg-gray-200 dark:bg-gray-700" 
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span>{t('small')}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{settings.fontSize}px</span>
                <span>{t('large')}</span>
              </div>
            </div>
          </div>
        );

      case 'notification':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{t('email_notification')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('email_when_new_result')}</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.emailNotification} 
                onChange={setEmailNotification} 
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-green-500" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{t('sound_notification')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('sound_on_complete')}</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.soundNotification} 
                onChange={setSoundNotification} 
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{t('quality_notification')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('notify_on_low_quality')}</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.qualityNotification} 
                onChange={setQualityNotification} 
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-500" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{t('news_update_notification')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('push_when_new_news')}</p>
                </div>
              </div>
              <ToggleSwitch enabled={true} onChange={() => {}} />
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('app_language')}</label>
              <select 
                className="select-field"
                value={settings.language}
                onChange={(e) => {
                  setLanguageSetting(e.target.value);
                  document.documentElement.lang = e.target.value;
                }}
              >
                <option value="zh">{t('chinese_simplified')}</option>
                <option value="en">{t('english')}</option>
              </select>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-800 dark:text-blue-200">{t('multi_language_support')}</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('language_switch_note')}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Fragment>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('settings')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('manage_account')}</p>
          </div>
          {saveStatus && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              saveStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {saveStatus === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {saveMessage}
            </div>
          )}
        </div>

        {settingsError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{settingsError}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1">
            <div className="card p-4 sticky top-6">
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeSection === section.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="font-medium">{t(section.titleKey)}</div>
                        <div className="text-xs text-gray-400">{t(section.descriptionKey)}</div>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={navigateToAdminLogin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all"
                >
                  <Crown className="w-5 h-5" />
                  <span className="font-medium">{t('admin_entry')}</span>
                </button>
                
                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-medium">{t('help_feedback')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {t(sections.find((s) => s.id === activeSection)?.titleKey || '')}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {t(sections.find((s) => s.id === activeSection)?.descriptionKey || '')}
                  </p>
                </div>
                {(activeSection !== 'security') && (
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? t('saving') : t('save_settings')}
                  </button>
                )}
              </div>
              
              {settingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-500 dark:text-gray-400">{t('loading_settings')}</span>
                </div>
              ) : (
                renderSection()
              )}
            </div>
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('submit_feedback')}</h3>
              </div>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback_content')}</label>
                <textarea 
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="input-field h-32 resize-none"
                  placeholder={t('describe_issue')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contact_info')}</label>
                <input 
                  type="text" 
                  value={feedbackContact}
                  onChange={(e) => setFeedbackContact(e.target.value)}
                  className="input-field"
                  placeholder={t('email_or_phone')}
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingFeedback ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmittingFeedback ? t('submitting') : t('submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}