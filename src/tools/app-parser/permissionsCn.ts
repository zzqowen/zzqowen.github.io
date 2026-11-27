// Android 权限中文映射，以 android.permission.* 常见项为主
// 条目按 Google AOSP 官方常量归纳，覆盖绝大多数国内应用会用到的权限

export const PERMISSION_CN: Record<string, { cn: string; category: '隐私' | '网络' | '存储' | '位置' | '通信' | '传感器' | '设备' | '媒体' | '支付' | '其他' }> = {
  // ====== 网络 ======
  'android.permission.INTERNET': { cn: '网络访问', category: '网络' },
  'android.permission.ACCESS_NETWORK_STATE': { cn: '查看网络状态', category: '网络' },
  'android.permission.ACCESS_WIFI_STATE': { cn: '查看 Wi-Fi 状态', category: '网络' },
  'android.permission.CHANGE_WIFI_STATE': { cn: '修改 Wi-Fi 状态', category: '网络' },
  'android.permission.CHANGE_WIFI_MULTICAST_STATE': { cn: 'Wi-Fi 组播', category: '网络' },
  'android.permission.CHANGE_NETWORK_STATE': { cn: '修改网络状态', category: '网络' },
  'android.permission.ACCESS_BLUETOOTH_STATE': { cn: '查看蓝牙状态', category: '网络' },
  'android.permission.BLUETOOTH': { cn: '蓝牙配对', category: '网络' },
  'android.permission.BLUETOOTH_ADMIN': { cn: '蓝牙管理', category: '网络' },
  'android.permission.BLUETOOTH_CONNECT': { cn: '蓝牙连接', category: '网络' },
  'android.permission.BLUETOOTH_SCAN': { cn: '扫描蓝牙设备', category: '网络' },
  'android.permission.BLUETOOTH_ADVERTISE': { cn: '蓝牙广播', category: '网络' },
  'android.permission.NEARBY_WIFI_DEVICES': { cn: '附近 Wi-Fi 设备', category: '网络' },
  'android.permission.USE_FULL_SCREEN_INTENT': { cn: '全屏弹窗（通知悬浮）', category: '网络' },

  // ====== 隐私 / 个人信息 ======
  'android.permission.READ_CONTACTS': { cn: '读取通讯录', category: '隐私' },
  'android.permission.WRITE_CONTACTS': { cn: '写入通讯录', category: '隐私' },
  'android.permission.GET_ACCOUNTS': { cn: '获取账号信息', category: '隐私' },
  'android.permission.READ_PROFILE': { cn: '读取个人资料', category: '隐私' },
  'android.permission.ACCESS_FINE_LOCATION': { cn: '精确定位', category: '位置' },
  'android.permission.ACCESS_COARSE_LOCATION': { cn: '大致定位', category: '位置' },
  'android.permission.ACCESS_BACKGROUND_LOCATION': { cn: '后台持续定位', category: '位置' },
  'android.permission.ACCESS_MEDIA_LOCATION': { cn: '读取照片位置信息', category: '位置' },
  'android.permission.CAMERA': { cn: '使用摄像头', category: '隐私' },
  'android.permission.RECORD_AUDIO': { cn: '录音', category: '隐私' },
  'android.permission.READ_SMS': { cn: '读取短信', category: '隐私' },
  'android.permission.SEND_SMS': { cn: '发送短信', category: '隐私' },
  'android.permission.RECEIVE_SMS': { cn: '接收短信', category: '隐私' },
  'android.permission.RECEIVE_MMS': { cn: '接收彩信', category: '隐私' },
  'android.permission.RECEIVE_WAP_PUSH': { cn: '接收 WAP Push', category: '隐私' },
  'android.permission.READ_PHONE_STATE': { cn: '读取手机状态（IMEI 等）', category: '隐私' },
  'android.permission.READ_PHONE_NUMBERS': { cn: '读取本机手机号', category: '隐私' },
  'android.permission.CALL_PHONE': { cn: '直接拨打电话', category: '隐私' },
  'android.permission.ADD_VOICEMAIL': { cn: '添加语音邮件', category: '隐私' },
  'android.permission.ANSWER_PHONE_CALLS': { cn: '接听来电', category: '隐私' },
  'android.permission.USE_SIP': { cn: '使用 SIP 服务', category: '隐私' },

  // ====== 存储 / 媒体 ======
  'android.permission.READ_EXTERNAL_STORAGE': { cn: '读取外部存储', category: '存储' },
  'android.permission.WRITE_EXTERNAL_STORAGE': { cn: '写入外部存储', category: '存储' },
  'android.permission.MANAGE_EXTERNAL_STORAGE': { cn: '管理所有文件', category: '存储' },
  'android.permission.READ_MEDIA_IMAGES': { cn: '读取图片', category: '媒体' },
  'android.permission.READ_MEDIA_VIDEO': { cn: '读取视频', category: '媒体' },
  'android.permission.READ_MEDIA_AUDIO': { cn: '读取音频', category: '媒体' },
  'android.permission.WRITE_MEDIA_IMAGES': { cn: '写入图片', category: '媒体' },
  'android.permission.WRITE_MEDIA_VIDEO': { cn: '写入视频', category: '媒体' },

  // ====== 通知 / 前台服务 ======
  'android.permission.POST_NOTIFICATIONS': { cn: '发送通知', category: '设备' },
  'android.permission.FOREGROUND_SERVICE': { cn: '前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE': { cn: '特殊用途前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC': { cn: '数据同步前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE': { cn: '连接设备前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK': { cn: '媒体播放前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION': { cn: '屏幕录制前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_MICROPHONE': { cn: '麦克风前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_CAMERA': { cn: '摄像头前台服务', category: '设备' },
  'android.permission.FOREGROUND_SERVICE_LOCATION': { cn: '定位前台服务', category: '设备' },
  'android.permission.SCHEDULE_EXACT_ALARM': { cn: '精确闹钟', category: '设备' },
  'android.permission.USE_EXACT_ALARM': { cn: '精确闹钟（兼容）', category: '设备' },
  'android.permission.RECEIVE_BOOT_COMPLETED': { cn: '开机自启动', category: '设备' },
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS': { cn: '忽略电池优化', category: '设备' },
  'android.permission.KILL_BACKGROUND_PROCESSES': { cn: '结束后台进程', category: '设备' },
  'android.permission.SET_ALARM': { cn: '设置闹钟', category: '设备' },
  'android.permission.VIBRATE': { cn: '震动', category: '设备' },
  'android.permission.WAKE_LOCK': { cn: '保持唤醒', category: '设备' },
  'android.permission.DISABLE_KEYGUARD': { cn: '停用锁屏', category: '设备' },
  'android.permission.ACCESS_NOTIFICATION_POLICY': { cn: '勿扰模式访问', category: '设备' },
  'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE': { cn: '监听通知', category: '设备' },
  'android.permission.PACKAGE_USAGE_STATS': { cn: '查看应用使用情况', category: '设备' },
  'android.permission.REQUEST_INSTALL_PACKAGES': { cn: '请求安装未知来源应用', category: '设备' },
  'android.permission.DELETE_PACKAGES': { cn: '卸载应用', category: '设备' },
  'android.permission.REQUEST_DELETE_PACKAGES': { cn: '请求卸载应用', category: '设备' },
  'android.permission.UPDATE_PACKAGES': { cn: '更新应用', category: '设备' },
  'android.permission.REQUEST_BIND_ACCESSIBILITY_SERVICE': { cn: '请求绑定无障碍服务', category: '设备' },
  'android.permission.SYSTEM_ALERT_WINDOW': { cn: '悬浮窗', category: '设备' },
  'android.permission.TYPE_APPLICATION_OVERLAY': { cn: '悬浮窗（兼容）', category: '设备' },
  'android.permission.WRITE_SETTINGS': { cn: '修改系统设置', category: '设备' },

  // ====== 传感器 ======
  'android.permission.BODY_SENSORS': { cn: '身体传感器（心率等）', category: '传感器' },
  'android.permission.BODY_SENSORS_BACKGROUND': { cn: '后台身体传感器', category: '传感器' },
  'android.permission.ACTIVITY_RECOGNITION': { cn: '识别用户活动', category: '传感器' },

  // ====== 附近设备 / NFC / USB ======
  'android.permission.NFC': { cn: 'NFC 读取', category: '网络' },
  'android.permission.NFC_TRANSACTION_EVENT': { cn: 'NFC 交易事件', category: '网络' },
  'android.permission.VIBRATOR': { cn: '震动（兼容）', category: '设备' },
  'android.permission.VIBRATOR_MANAGER': { cn: '震动管理', category: '设备' },

  // ====== 应用签名 / 自定义权限占位 ======
  'android.permission.SIGNATURE': { cn: '同签名应用可见', category: '其他' },
}

export function translatePermission(permission: string): { cn: string; category: string } {
  const direct = PERMISSION_CN[permission]
  if (direct) return direct
  // 自定义权限：去掉 android.permission. 前缀、按 . 分隔最后一段做个粗略翻译
  const shortName = permission.replace(/^android\.permission\./, '')
  const lastSegment = shortName.split('.').pop() ?? shortName
  return { cn: lastSegment.replace(/_/g, ' '), category: '其他' }
}
