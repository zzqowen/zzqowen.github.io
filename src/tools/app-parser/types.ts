export type Binary = Uint8Array | ArrayBuffer

export interface AppIcon {
  path: string
  width?: number
  height?: number
  bytes: Uint8Array
  mime: string
  size: number
}

export type AppPlatform = 'android' | 'ios'

export interface AndroidAppInfo {
  platform: 'android'
  packageName: string
  label?: string
  versionName?: string
  versionCode?: string
  minSdkVersion?: string
  targetSdkVersion?: string
  iconResource?: string
  roundIconResource?: string
  mainActivity?: string
  permissions: string[]
  features: string[]
  activities: string[]
  usesFeatures: string[]
}

export interface IosAppInfo {
  platform: 'ios'
  displayName?: string
  bundleName?: string
  bundleId: string
  shortVersion?: string
  buildVersion?: string
  minimumOsVersion?: string
  platformName?: string
  platformVersion?: string
  developmentRegion?: string
  deviceFamily?: string[]
}

export type AppInfo = AndroidAppInfo | IosAppInfo

export interface ParsedApp {
  fileName: string
  platform: AppPlatform
  info: AppInfo
  icon?: AppIcon
  allIcons: AppIcon[]
  warnings: string[]
}
