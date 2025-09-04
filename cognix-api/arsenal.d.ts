export interface ArsenalFeatures {
  deepResearch: boolean;
  smartSearch: boolean; // uses your Agentic V2
  explainLikePhD: boolean;
}

export interface ArsenalApps {
  gmail: boolean;
  reddit: boolean;
  twitter: boolean;
  youtube: boolean;
  notion: boolean;
  whatsapp: boolean; // future
}

export interface ArsenalConfig {
  features: ArsenalFeatures;
  apps: ArsenalApps;
}
