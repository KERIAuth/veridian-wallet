/**
 * Backend helper for group profile testing
 * 
 * Provides mock implementations for multi-wallet scenarios in E2E tests.
 * OOBI URLs ("Out-Of-Band Introductions") are KERIA links/QRs that let another wallet
 * discover a specific identifier/group; in tests we mock them so the scan flow has valid input.
 */

function buildMockOobiUrl(params: {
  name: string;
  groupName: string;
  thresholdInfo?: string;
}): string {
  const now = Date.now();
  const mockGroupId = `mock-group-${params.groupName}-${now}`;
  const mockAid = `mock-aid-${now}`;
  const mockAgentId = `mock-agent-${now}`;
  
  const keriaBaseUrl = process.env.KERIA_IP 
    ? `http://${process.env.KERIA_IP}:3901`
    : "http://127.0.0.1:3901";
  
  const url = new URL(
    `/oobi/${mockAid}/agent/${mockAgentId}`,
    keriaBaseUrl
  );
  
  url.searchParams.set("groupId", mockGroupId);
  url.searchParams.set("name", params.name);
  
  if (params.thresholdInfo) {
    url.searchParams.set("threshold", params.thresholdInfo);
  }
  
  return url.toString();
}

/**
 * Creates a group invitation QR code payload for a 1 of 2 threshold group
 */
export async function createOneOfTwoGroupInvite(
  groupName: string,
  joinerAlias: string
): Promise<string> {
  return buildMockOobiUrl({
    name: joinerAlias,
    groupName,
  });
}


/**
 * Creates a group with specified threshold in an external wallet
 */
export async function createExternalGroupWithThreshold(
  groupName: string,
  requiredSigners: number,
  totalSigners: number
): Promise<string> {
  const thresholdInfo = `${requiredSigners}-of-${totalSigners}`;
  return buildMockOobiUrl({
    name: groupName,
    groupName,
    thresholdInfo,
  });
}
