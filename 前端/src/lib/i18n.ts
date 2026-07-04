interface Translations {
  [key: string]: {
    [lang: string]: string;
  };
}

const translations: Translations = {
  settings: {
    zh: '设置中心',
    en: 'Settings',
  },
  manage_account: {
    zh: '管理您的账户和应用偏好',
    en: 'Manage your account and app preferences',
  },
  profile: {
    zh: '个人信息',
    en: 'Profile',
  },
  security: {
    zh: '安全与隐私',
    en: 'Security & Privacy',
  },
  appearance: {
    zh: '外观设置',
    en: 'Appearance',
  },
  notification: {
    zh: '通知设置',
    en: 'Notifications',
  },
  language: {
    zh: '语言设置',
    en: 'Language',
  },
  manage_profile: {
    zh: '管理您的个人资料和头像',
    en: 'Manage your profile and avatar',
  },
  manage_security: {
    zh: '管理账户安全和隐私',
    en: 'Manage account security and privacy',
  },
  customize_theme: {
    zh: '自定义界面主题和字体',
    en: 'Customize interface theme and fonts',
  },
  configure_notifications: {
    zh: '配置消息通知偏好',
    en: 'Configure notification preferences',
  },
  select_language: {
    zh: '选择应用显示语言',
    en: 'Select app display language',
  },
  admin_entry: {
    zh: '管理员入口',
    en: 'Admin Entry',
  },
  help_feedback: {
    zh: '帮助与反馈',
    en: 'Help & Feedback',
  },
  save_settings: {
    zh: '保存设置',
    en: 'Save Settings',
  },
  saving: {
    zh: '保存中...',
    en: 'Saving...',
  },
  save_success: {
    zh: '设置保存成功',
    en: 'Settings saved successfully',
  },
  save_failed: {
    zh: '保存失败，请重试',
    en: 'Save failed, please retry',
  },
  loading_settings: {
    zh: '加载设置中...',
    en: 'Loading settings...',
  },
  upload_avatar: {
    zh: '上传头像',
    en: 'Upload Avatar',
  },
  change_avatar: {
    zh: '更换头像',
    en: 'Change Avatar',
  },
  username: {
    zh: '用户名',
    en: 'Username',
  },
  email: {
    zh: '邮箱地址',
    en: 'Email',
  },
  bio: {
    zh: '个人简介',
    en: 'Bio',
  },
  enter_email: {
    zh: '请输入邮箱',
    en: 'Please enter email',
  },
  introduce_yourself: {
    zh: '简单介绍一下自己...',
    en: 'Tell us about yourself...',
  },
  change_password: {
    zh: '修改密码',
    en: 'Change Password',
  },
  old_password: {
    zh: '原密码',
    en: 'Old Password',
  },
  new_password: {
    zh: '新密码',
    en: 'New Password',
  },
  confirm_password: {
    zh: '确认密码',
    en: 'Confirm Password',
  },
  enter_old_password: {
    zh: '请输入原密码',
    en: 'Please enter old password',
  },
  enter_new_password: {
    zh: '请输入新密码',
    en: 'Please enter new password',
  },
  reenter_new_password: {
    zh: '请再次输入新密码',
    en: 'Please re-enter new password',
  },
  password_requirements: {
    zh: '密码要求',
    en: 'Password Requirements',
  },
  min_6_chars: {
    zh: '至少6个字符',
    en: 'At least 6 characters',
  },
  require_letter: {
    zh: '必须包含字母 (a-z, A-Z)',
    en: 'Must contain letters (a-z, A-Z)',
  },
  require_number: {
    zh: '必须包含数字 (0-9)',
    en: 'Must contain numbers (0-9)',
  },
  password_min_6_chars: {
    zh: '密码长度至少6位',
    en: 'Password must be at least 6 characters',
  },
  confirm_change_password: {
    zh: '确认更改密码',
    en: 'Confirm Password Change',
  },
  changing: {
    zh: '修改中...',
    en: 'Changing...',
  },
  password_changed_success: {
    zh: '密码修改成功',
    en: 'Password changed successfully',
  },
  theme_mode: {
    zh: '主题模式',
    en: 'Theme Mode',
  },
  light_mode: {
    zh: '浅色模式',
    en: 'Light Mode',
  },
  dark_mode: {
    zh: '深色模式',
    en: 'Dark Mode',
  },
  system_mode: {
    zh: '跟随系统',
    en: 'Follow System',
  },
  font_size: {
    zh: '字体大小',
    en: 'Font Size',
  },
  small: {
    zh: '小号',
    en: 'Small',
  },
  large: {
    zh: '大号',
    en: 'Large',
  },
  interface_effects: {
    zh: '界面效果',
    en: 'Interface Effects',
  },
  animation_effects: {
    zh: '动画效果',
    en: 'Animation Effects',
  },
  interface_transitions: {
    zh: '界面切换动画',
    en: 'Interface transition animations',
  },
  glass_effect: {
    zh: '毛玻璃效果',
    en: 'Glass Effect',
  },
  card_blur: {
    zh: '卡片模糊背景',
    en: 'Card blur background',
  },
  email_notification: {
    zh: '邮件通知',
    en: 'Email Notifications',
  },
  email_when_new_result: {
    zh: '当有新的处理结果时发送邮件通知',
    en: 'Send email when new processing results are available',
  },
  sound_notification: {
    zh: '声音提示',
    en: 'Sound Notifications',
  },
  sound_on_complete: {
    zh: '处理完成时播放提示音',
    en: 'Play sound when processing completes',
  },
  quality_notification: {
    zh: '摘要质量通知',
    en: 'Summary Quality Notifications',
  },
  notify_on_low_quality: {
    zh: '当摘要质量低于阈值时通知',
    en: 'Notify when summary quality is below threshold',
  },
  news_update_notification: {
    zh: '新闻更新通知',
    en: 'News Update Notifications',
  },
  push_when_new_news: {
    zh: '当有新新闻时推送通知',
    en: 'Push notifications when new news is available',
  },
  app_language: {
    zh: '应用语言',
    en: 'App Language',
  },
  chinese_simplified: {
    zh: '中文 (简体)',
    en: 'Chinese (Simplified)',
  },
  english: {
    zh: 'English',
    en: 'English',
  },
  multi_language_support: {
    zh: '多语言支持',
    en: 'Multi-language Support',
  },
  language_switch_note: {
    zh: '应用支持中文和英文两种语言，切换后即时生效。',
    en: 'The app supports both Chinese and English languages, changes take effect immediately.',
  },
  submit_feedback: {
    zh: '提交反馈',
    en: 'Submit Feedback',
  },
  feedback_content: {
    zh: '反馈内容',
    en: 'Feedback Content',
  },
  describe_issue: {
    zh: '请描述您遇到的问题或建议...',
    en: 'Please describe the issue or suggestion...',
  },
  contact_info: {
    zh: '联系方式（选填）',
    en: 'Contact Information (Optional)',
  },
  email_or_phone: {
    zh: '邮箱或手机号',
    en: 'Email or phone number',
  },
  submit: {
    zh: '提交',
    en: 'Submit',
  },
  submitting: {
    zh: '提交中...',
    en: 'Submitting...',
  },
  feedback_submitted: {
    zh: '反馈提交成功，感谢您的反馈',
    en: 'Feedback submitted successfully, thank you for your feedback',
  },
  enter_feedback: {
    zh: '请输入反馈内容',
    en: 'Please enter feedback content',
  },
  personal_history: {
    zh: '个人历史',
    en: 'Personal History',
  },
  view_manage_history: {
    zh: '查看和管理您的处理记录和浏览记录',
    en: 'View and manage your processing and browsing history',
  },
  process_history: {
    zh: '处理记录',
    en: 'Processing History',
  },
  browse_history: {
    zh: '浏览记录',
    en: 'Browse History',
  },
  search_records: {
    zh: '搜索记录...',
    en: 'Search records...',
  },
  no_history: {
    zh: '暂无历史记录',
    en: 'No history records',
    },
  start_processing_hint: {
    zh: '开始处理新闻后，记录会保存在这里',
    en: 'Records will be saved here after you start processing news',
  },
  no_browse_history: {
    zh: '暂无浏览记录',
    en: 'No browse history',
  },
  browse_news_hint: {
    zh: '浏览新闻后，记录会保存在这里',
    en: 'Records will be saved here after you browse news',
  },
  clear_browse_history: {
    zh: '清空浏览记录',
    en: 'Clear Browse History',
  },
  export_all: {
    zh: '导出全部',
    en: 'Export All',
  },
  export_selected: {
    zh: '导出选中',
    en: 'Export Selected',
  },
  delete_selected: {
    zh: '删除选中',
    en: 'Delete Selected',
  },
  select_all: {
    zh: '全选',
    en: 'Select All',
  },
  view_details: {
    zh: '查看详情',
    en: 'View Details',
  },
  delete: {
    zh: '删除',
    en: 'Delete',
  },
  news_detail: {
    zh: '新闻详情',
    en: 'News Detail',
  },
  read_original: {
    zh: '阅读原文',
    en: 'Read Original',
  },
  generate_summary: {
    zh: '生成摘要',
    en: 'Generate Summary',
  },
  news_summary: {
    zh: '新闻摘要',
    en: 'News Summary',
  },
  news_content: {
    zh: '新闻内容',
    en: 'News Content',
  },
  published_at: {
    zh: '发布时间',
    en: 'Published At',
  },
  views: {
    zh: '浏览量',
    en: 'Views',
  },
  browsed_at: {
    zh: '浏览于',
    en: 'Browsed At',
  },
  click_to_view: {
    zh: '点击查看详情',
    en: 'Click to view details',
  },
  delete_browse_history: {
    zh: '确定要清空所有浏览记录吗？',
    en: 'Are you sure you want to clear all browse history?',
  },
  delete_record: {
    zh: '确定要删除这条记录吗？',
    en: 'Are you sure you want to delete this record?',
  },
  delete_selected_records: {
    zh: '确定要删除选中的',
    en: 'Are you sure you want to delete the selected',
  },
  records: {
    zh: '条记录吗？',
    en: ' records?',
  },
  select_records_first: {
    zh: '请先选择要删除的记录',
    en: 'Please select records to delete first',
  },
  no_records_to_export: {
    zh: '没有可导出的记录',
    en: 'No records to export',
  },
  all_time: {
    zh: '全部时间',
    en: 'All Time',
  },
  today: {
    zh: '今天',
    en: 'Today',
  },
  this_week: {
    zh: '本周',
    en: 'This Week',
  },
  this_month: {
    zh: '本月',
    en: 'This Month',
  },
  custom: {
    zh: '自定义',
    en: 'Custom',
  },
  international: {
    zh: '国际',
    en: 'International',
  },
  politics: {
    zh: '时政',
    en: 'Politics',
  },
  technology: {
    zh: '科技',
    en: 'Technology',
  },
  finance: {
    zh: '财经',
    en: 'Finance',
  },
  sports: {
    zh: '体育',
    en: 'Sports',
  },
  entertainment: {
    zh: '娱乐',
    en: 'Entertainment',
  },
  health: {
    zh: '健康',
    en: 'Health',
  },
  comprehensive: {
    zh: '综合',
    en: 'General',
  },
  all_categories: {
    zh: '全部',
    en: 'All',
  },
  user: {
    zh: '用户',
    en: 'User',
  },
  avatar: {
    zh: '头像',
    en: 'Avatar',
  },
  fill_in_all_fields: {
    zh: '请填写完整信息',
    en: 'Please fill in all fields',
  },
  passwords_do_not_match: {
    zh: '新密码两次输入不一致',
    en: 'New passwords do not match',
  },
  password_min_8_chars: {
    zh: '密码长度至少8位',
    en: 'Password must be at least 8 characters',
  },
  cancel: {
    zh: '取消',
    en: 'Cancel',
  },
  password: {
    zh: '密码',
    en: 'Password',
  },
  user_login: {
    zh: '用户登录',
    en: 'User Login',
  },
  admin_login: {
    zh: '管理员登录',
    en: 'Admin Login',
  },
  enter_username: {
    zh: '请输入用户名',
    en: 'Please enter username',
  },
  enter_admin_username: {
    zh: '请输入管理员用户名',
    en: 'Please enter admin username',
  },
  enter_password: {
    zh: '请输入密码',
    en: 'Please enter password',
  },
  enter_admin_password: {
    zh: '请输入管理员密码',
    en: 'Please enter admin password',
  },
  captcha: {
    zh: '验证码',
    en: 'Captcha',
  },
  enter_captcha: {
    zh: '请输入验证码',
    en: 'Please enter captcha',
  },
  remember_me: {
    zh: '记住我',
    en: 'Remember me',
  },
  forgot_password: {
    zh: '忘记密码？',
    en: 'Forgot password?',
  },
  login: {
    zh: '登录',
    en: 'Login',
  },
  logging_in: {
    zh: '登录中...',
    en: 'Logging in...',
  },
  no_account: {
    zh: '还没有账号？',
    en: "Don't have an account?",
  },
  register_now: {
    zh: '立即注册',
    en: 'Register now',
  },
  or_login_with: {
    zh: '或使用以下方式登录',
    en: 'Or login with',
  },
  news_quick_view: {
    zh: '今日新闻速览',
    en: 'Today News',
  },
  news_summary_title: {
    zh: '新闻摘要与标题生成',
    en: 'News Summary & Title',
  },
  data_analysis: {
    zh: '数据分析',
    en: 'Analytics',
  },
  settings_center: {
    zh: '设置中心',
    en: 'Settings',
  },
  logout: {
    zh: '退出登录',
    en: 'Logout',
  },
  content_input: {
    zh: '内容输入',
    en: 'Content Input',
  },
  summary_generation: {
    zh: '摘要生成',
    en: 'Summary',
  },
  title_generation: {
    zh: '标题生成',
    en: 'Title',
  },
  quality_verification: {
    zh: '质量验证',
    en: 'Quality',
  },
  complete_export: {
    zh: '完成导出',
    en: 'Complete',
  },
  ai_news_assistant: {
    zh: 'AI新闻助手',
    en: 'AI News Assistant',
  },
};

export const useTranslation = (lang: string = 'zh') => {
  return {
    t: (key: string) => translations[key]?.[lang] || key,
    lang,
  };
};

export const getTranslation = (key: string, lang: string = 'zh') => {
  return translations[key]?.[lang] || key;
};

export default translations;