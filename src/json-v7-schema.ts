export interface CoverityIssuesView {
  type: string
  formatVersion: number
  suppressedIssueCount: number
  issues: IssueOccurrence[]
  error?: Error
  warnings: Error[]
  desktopAnalysisSettings: DesktopAnalysisSettings
}

// Issues

export interface IssueOccurrence {
  mergeKey: string
  occurrenceCountForMK: number
  occurrenceNumberInMK: number
  referenceOccurrenceCountForMK: number
  checkerName: string
  subcategory: string
  type: string
  subtype: string
  extra: string
  domain: string
  language?: string
  'code-language'?: string
  mainEventFilePathname: string
  mainEventLineNumber: number
  properties: Map<string, string> | any
  functionDisplayName?: string
  functionMangledName?: string
  localStatus?: string
  ordered: boolean
  events: Event[]
  checkerProperties?: CheckerProperties
  stateOnServer?: StateOnServer
}

export interface Event {
  covLStrEventDescription: string
  eventDescription: string
  eventNumber: number
  eventTreePosition: string
  eventSet: number
  eventTag: string
  filePathname: string
  strippedFilePathname: string
  lineNumber: number
  main: boolean
  moreInformationId?: string
  remediation: boolean
  events?: Event[]
}

export interface CheckerProperties {
  category: string
  categoryDescription: string
  cweCategory: string
  issueKinds: string[]
  eventSetCaptions: string[]
  impact: string
  impactDescription: string
  subcategoryLocalEffect: string
  subcategoryLongDescription: string
  subcategoryShortDescription: string
  MISRACategory?: string
}

export interface StateOnServer {
  cid: number
  presentInReferenceSnapshot: boolean
  firstDetectedDateTime: string
  stream: string
  components: string[]
  componentOwners?: any
  cached: boolean
  retrievalDateTime: string
  ownerLdapServerName: string
  triage: Triage
  customTriage: CustomTriage
}

export interface Triage {
  classification: string
  action: string
  fixTarget: string
  severity: string
  legacy: string
  owner: string
  externalReference: string
}

export interface CustomTriage {
  // set of key-value pairs
}

// Error/Warnings

export interface Error {
  errorType: string
  errorSubType: string
  errorMessage: any
  // ... other errorType-specific attributes ...
}

// Desktop Analysis Settings

export interface DesktopAnalysisSettings {
  analysisDateTime: string
  covRunDesktopArgs: string[]
  effectiveStripPaths: string[]
  analysisScopePathnames: string[]
  strippedAnalysisScopePathnames: string[]
  auxiliaryScopePathnames: string[]
  strippedAuxiliaryScopePathnames: string[]
  relativeTo?: string
  intermediateDir: string
  effectiveAnalysisSettings: PortableAnalysisSettings
  referenceSnapshot?: ReferenceSnapshotDetails
}

export interface ReferenceSnapshotDetails {
  snapshotId: number
  codeVersionDateTime: string
  description: string
  version: string
  analysisVersion: string
  analysisVersionOverride: string
  target: string
  analysisSettings: PortableAnalysisSettings
}

export interface PortableAnalysisSettings {
  covAnalyzeArgs: string[]
  fbExcludeConfigurations: string[]
  fbIncludeConfiguration: string
  fileCheckerOptions: FileCheckerOption[]
}

export interface FileCheckerOption {
  checkerName: string
  optionName: string
  fileContents: string
}
