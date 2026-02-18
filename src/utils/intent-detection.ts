/**
 * Intent Detection Utility
 * Analyzes user queries to determine which apps are needed for task execution
 * Supports multi-app workflows and sequential app launching
 */

export type AppId = 
  | "chrome"
  | "gmail"
  | "instagram"
  | "linkedin"
  | "notion"
  | "slack"
  | "zoom"
  | "salesforce"
  | "quickbooks"
  | "asana"
  | "sheets"
  | "facebook";

interface AppDetection {
  keywords: string[];
  urlPatterns: string[];
  priority: number;
}

const APP_DETECTION_MAP: Record<AppId, AppDetection> = {
  instagram: {
    keywords: ['instagram', 'insta', 'ig', 'dm on instagram', 'post on instagram'],
    urlPatterns: ['instagram.com', 'instagr.am'],
    priority: 1, // Highest priority
  },
  gmail: {
    keywords: ['gmail', 'email', 'mail', 'inbox', 'compose email', 'send email'],
    urlPatterns: ['mail.google.com', 'gmail.com'],
    priority: 2,
  },
  linkedin: {
    keywords: ['linkedin', 'linked in', 'message on linkedin', 'connect on linkedin'],
    urlPatterns: ['linkedin.com', 'lnkd.in'],
    priority: 3,
  },
  slack: {
    keywords: ['slack', 'message on slack', 'slack channel', 'slack dm'],
    urlPatterns: ['slack.com', 'app.slack.com'],
    priority: 4,
  },
  sheets: {
    keywords: ['google sheets', 'sheets', 'spreadsheet'],
    urlPatterns: ['docs.google.com/spreadsheets', 'sheets.google.com'],
    priority: 5,
  },
  notion: {
    keywords: ['notion', 'take notes', 'notion page'],
    urlPatterns: ['notion.so', 'notion.site'],
    priority: 6,
  },
  zoom: {
    keywords: ['zoom', 'video call', 'meeting', 'join zoom'],
    urlPatterns: ['zoom.us', 'zoom.com'],
    priority: 7,
  },
  salesforce: {
    keywords: ['salesforce', 'crm', 'sales crm'],
    urlPatterns: ['salesforce.com', 'lightning.force.com'],
    priority: 8,
  },
  quickbooks: {
    keywords: ['quickbooks', 'accounting', 'invoices'],
    urlPatterns: ['quickbooks.intuit.com', 'qbo.intuit.com'],
    priority: 9,
  },
  asana: {
    keywords: ['asana', 'task management', 'project management'],
    urlPatterns: ['app.asana.com', 'asana.com'],
    priority: 10,
  },
  facebook: {
    keywords: ['facebook', 'fb', 'post on facebook', 'facebook messenger'],
    urlPatterns: ['facebook.com', 'fb.com', 'm.facebook.com'],
    priority: 11,
  },
  chrome: {
    keywords: ['chrome', 'browser', 'web', 'search', 'google', 'website'],
    urlPatterns: ['http://', 'https://', 'www.'],
    priority: 100, // Lowest priority - fallback for web browsing
  },
};

/**
 * Detects which apps are needed based on user query
 * @param query User's task query
 * @returns Ordered list of app IDs needed for the task
 */
export function detectAppsFromQuery(query: string): AppId[] {
  const queryLower = query.toLowerCase();
  const detectedApps = new Set<AppId>();

  // First pass: URL pattern detection (highest priority)
  Object.entries(APP_DETECTION_MAP).forEach(([appId, detection]) => {
    for (const pattern of detection.urlPatterns) {
      if (queryLower.includes(pattern.toLowerCase())) {
        detectedApps.add(appId as AppId);
        break;
      }
    }
  });

  // Second pass: Keyword detection
  Object.entries(APP_DETECTION_MAP).forEach(([appId, detection]) => {
    for (const keyword of detection.keywords) {
      // Use word boundary to avoid false matches (e.g., "instagram" shouldn't match "instagrams")
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(query)) {
        detectedApps.add(appId as AppId);
        break;
      }
    }
  });

  // Special case: Instagram URL with "inbox" should prioritize Instagram over Gmail
  if (queryLower.includes('instagram') && queryLower.includes('inbox')) {
    detectedApps.delete('gmail');
  }

  // If no specific apps detected and query looks like a web task, add Chrome
  if (detectedApps.size === 0) {
    const webIndicators = ['go to', 'visit', 'open', 'search for', 'find', 'look up', 'browse'];
    const hasWebIndicator = webIndicators.some(indicator => queryLower.includes(indicator));
    if (hasWebIndicator) {
      detectedApps.add('chrome');
    }
  }

  // Remove Chrome if more specific apps are detected (Chrome is just fallback)
  if (detectedApps.size > 1 && detectedApps.has('chrome')) {
    const hasSpecificApp = Array.from(detectedApps).some(
      app => app !== 'chrome' && APP_DETECTION_MAP[app].priority < 50
    );
    if (hasSpecificApp) {
      detectedApps.delete('chrome');
    }
  }

  // Sort by priority (lower number = higher priority)
  const sortedApps = Array.from(detectedApps).sort((a, b) => {
    return APP_DETECTION_MAP[a].priority - APP_DETECTION_MAP[b].priority;
  });

  console.log(`🎯 Intent Detection: "${query}" → Apps:`, sortedApps);
  
  return sortedApps;
}

/**
 * Extracts multi-step workflow from query
 * Looks for sequential indicators like "then", "after that", "and then"
 * @param query User's task query
 * @returns Array of sub-tasks in order
 */
export function extractWorkflowSteps(query: string): string[] {
  // Split on sequential indicators
  const separators = [
    ' then ',
    ' and then ',
    ' after that ',
    ' next ',
    ' afterwards ',
    ', then ',
    '; then '
  ];
  
  let steps = [query];
  for (const separator of separators) {
    const newSteps: string[] = [];
    for (const step of steps) {
      const split = step.split(new RegExp(separator, 'i'));
      newSteps.push(...split);
    }
    steps = newSteps;
  }

  // Clean up steps
  steps = steps
    .map(step => step.trim())
    .filter(step => step.length > 0);

  console.log(`📋 Workflow Steps: ${steps.length} step(s)`, steps);
  
  return steps;
}

/**
 * Determines if a query requires multiple apps
 * @param query User's task query
 * @returns true if multi-app workflow detected
 */
export function isMultiAppWorkflow(query: string): boolean {
  const apps = detectAppsFromQuery(query);
  const steps = extractWorkflowSteps(query);
  
  return apps.length > 1 || steps.length > 1;
}

/**
 * Generates a friendly description of the detected workflow
 * @param query User's task query
 * @returns Human-readable workflow description
 */
export function describeWorkflow(query: string): string {
  const apps = detectAppsFromQuery(query);
  const steps = extractWorkflowSteps(query);
  
  if (apps.length === 0) {
    return "No specific apps detected. Using Chrome for web browsing.";
  }
  
  if (apps.length === 1) {
    return `Opening ${apps[0].toUpperCase()} for this task.`;
  }
  
  if (steps.length > 1) {
    return `Multi-step workflow: ${steps.length} steps across ${apps.length} app(s) (${apps.join(', ')})`;
  }
  
  return `Opening ${apps.length} apps: ${apps.join(' → ')}`;
}
