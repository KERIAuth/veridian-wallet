import { NextFunction, Request, Response } from "express";
import { Serder, SignifyClient } from "signify-ts";
import { ISSUER_NAME, SEDI_SCHEMA_SAID } from "../consts";
import { getRegistry, waitAndGetDoneOp, OP_TIMEOUT } from "../utils/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SediApplication {
  id: string;
  aid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  driversLicense?: string;
  documentFileName?: string;
  signature: string[];
  submittedAt: string;
  // IPEX solicited flow SAIDs
  applySaid?: string;   // SAID of the /ipex/apply exn from the resident
  offerSaid?: string;   // SAID of the /ipex/offer exn sent to the resident
  grantSaid?: string;   // SAID of the /ipex/grant exn sent to the resident
  credentialSaid?: string;
  status: "pending" | "offered" | "issued" | "rejected";
}

// In-memory store — sufficient for a demo.
const applications = new Map<string, SediApplication>();

// ─── Internal helpers ────────────────────────────────────────────────────────

function findLatestByAid(aid: string): SediApplication | undefined {
  return Array.from(applications.values())
    .filter((a) => a.aid === aid)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
}

function findByOfferSaid(offerSaid: string): SediApplication | undefined {
  return Array.from(applications.values()).find((a) => a.offerSaid === offerSaid);
}

// ─── POST /sedi/apply ────────────────────────────────────────────────────────

export async function sediApply(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { aid, firstName, lastName, dateOfBirth, address, driversLicense, documentFileName, signature, applySaid } =
    req.body;

  if (!aid || !firstName || !lastName || !dateOfBirth || !address) {
    res.status(400).json({ success: false, error: "Missing required fields" });
    return;
  }

  const id = `sedi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const application: SediApplication = {
    id,
    aid,
    firstName,
    lastName,
    dateOfBirth,
    address,
    driversLicense,
    documentFileName,
    signature: signature || [],
    submittedAt: new Date().toISOString(),
    applySaid: applySaid || undefined,
    status: "pending",
  };

  applications.set(id, application);
  console.log(`[SEDI] Application received: ${id} for AID ${aid.slice(0, 20)}... applySaid=${applySaid || "none"}`);

  res.status(202).json({ success: true, data: { applicationId: id } });
}

// ─── GET /sedi/applications ──────────────────────────────────────────────────

export async function sediApplicationsList(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const list = Array.from(applications.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  res.status(200).json({ success: true, data: list });
}

// ─── POST /sedi/applications/:id/issue ──────────────────────────────────────
// Admin approves → issue ACDC → send IPEX offer to resident

export async function sediIssue(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { id } = req.params;
  const application = applications.get(id);

  if (!application) {
    res.status(404).json({ success: false, error: "Application not found" });
    return;
  }
  if (application.status !== "pending") {
    res.status(409).json({ success: false, error: `Application already ${application.status}` });
    return;
  }

  const client: SignifyClient = req.app.get("signifyClient");

  try {
    const registry = await getRegistry(client, ISSUER_NAME);

    const issueParams = {
      ri: registry,
      s: SEDI_SCHEMA_SAID,
      a: {
        i: application.aid,
        dt: new Date().toISOString(),
        firstName: application.firstName,
        lastName: application.lastName,
        dateOfBirth: application.dateOfBirth,
        address: application.address,
        ...(application.driversLicense ? { driversLicense: application.driversLicense } : {}),
      },
    };

    // Issue the ACDC
    const result = await client.credentials().issue(ISSUER_NAME, issueParams);
    const op = await waitAndGetDoneOp(client, result.op, OP_TIMEOUT);

    if (!op.done) {
      res.status(500).json({ success: false, error: "Credential issuance timed out" });
      return;
    }

    const credential = await client.credentials().get(result.acdc.ked.d);
    const credentialSaid = credential.sad.d;
    const datetime = new Date().toISOString().replace("Z", "000+00:00");

    // Send IPEX offer to resident (solicited flow)
    const [offer, osigs, oend] = await client.ipex().offer({
      senderName: ISSUER_NAME,
      recipient: application.aid,
      acdc: new Serder(credential.sad),
      applySaid: application.applySaid,
      datetime,
    });
    await client.ipex().submitOffer(ISSUER_NAME, offer, osigs, oend, [application.aid]);

    const offerSaid = offer.ked.d;

    application.status = "offered";
    application.credentialSaid = credentialSaid;
    application.offerSaid = offerSaid;
    applications.set(id, application);

    console.log(`[SEDI] Credential issued and offer sent: ${credentialSaid} → offer ${offerSaid} to AID ${application.aid.slice(0, 20)}...`);
    res.status(200).json({ success: true, data: { credentialSaid, offerSaid } });
  } catch (err: any) {
    console.error("[SEDI] Issue/offer error:", err);
    res.status(500).json({ success: false, error: err?.message || "Issuance failed" });
  }
}

// ─── processAgreeExn (called by PollingService) ──────────────────────────────
// When resident's /ipex/agree exn arrives: send the IPEX grant

export async function processAgreeExn(
  client: SignifyClient,
  senderAid: string,
  offerSaid: string,
  agreeSaid: string
): Promise<void> {
  const application = findByOfferSaid(offerSaid);
  if (!application) {
    console.warn(`[SEDI] agree exn received but no application found for offerSaid=${offerSaid}`);
    return;
  }
  if (application.status !== "offered") {
    console.warn(`[SEDI] agree exn for application ${application.id} but status is ${application.status}`);
    return;
  }
  if (!application.credentialSaid) {
    console.error(`[SEDI] agree exn for application ${application.id} but credentialSaid is missing`);
    return;
  }

  try {
    const credential = await client.credentials().get(application.credentialSaid);
    const datetime = new Date().toISOString().replace("Z", "000+00:00");

    const [grant, gsigs, gend] = await client.ipex().grant({
      senderName: ISSUER_NAME,
      recipient: application.aid,
      acdc: new Serder(credential.sad),
      anc: new Serder(credential.anc),
      iss: new Serder(credential.iss),
      ancAttachment: credential.ancatc?.[0],
      agreeSaid,
      datetime,
    });
    await client.ipex().submitGrant(ISSUER_NAME, grant, gsigs, gend, [application.aid]);

    const grantSaid = grant.ked.d;
    application.status = "issued";
    application.grantSaid = grantSaid;
    applications.set(application.id, application);

    console.log(`[SEDI] Grant sent: ${grantSaid} to AID ${application.aid.slice(0, 20)}...`);
  } catch (err: any) {
    console.error("[SEDI] Grant error:", err);
  }
}

// ─── GET /sedi/issuerAid ─────────────────────────────────────────────────────

export async function sediIssuerAid(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const client: SignifyClient = req.app.get("signifyClient");
  try {
    const identifier = await client.identifiers().get(ISSUER_NAME);
    res.status(200).json({ success: true, data: { aid: identifier.prefix } });
  } catch (err: any) {
    console.error("[SEDI] issuerAid error:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to get issuer AID" });
  }
}

// ─── GET /sedi/offer?aid=X ───────────────────────────────────────────────────

export async function sediOffer(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { aid } = req.query as { aid?: string };
  if (!aid) {
    res.status(400).json({ success: false, error: "Missing aid query parameter" });
    return;
  }

  const application = findLatestByAid(aid);
  if (!application?.offerSaid) {
    res.status(404).json({ success: false, data: null });
    return;
  }

  res.status(200).json({
    success: true,
    data: { offerSaid: application.offerSaid },
  });
}

// ─── GET /sedi/grant?aid=X ───────────────────────────────────────────────────

export async function sediGrant(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { aid } = req.query as { aid?: string };
  if (!aid) {
    res.status(400).json({ success: false, error: "Missing aid query parameter" });
    return;
  }

  const application = findLatestByAid(aid);
  if (!application?.grantSaid) {
    res.status(404).json({ success: false, data: null });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      grantSaid: application.grantSaid,
      credentialSaid: application.credentialSaid,
    },
  });
}

// ─── GET /sedi/credential?aid=X ─────────────────────────────────────────────

export async function sediCredential(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { aid } = req.query as { aid?: string };
  if (!aid) {
    res.status(400).json({ success: false, error: "Missing aid query parameter" });
    return;
  }

  const client: SignifyClient = req.app.get("signifyClient");

  try {
    const credentials = await client.credentials().list({
      filter: {
        "-a-i": aid,
        "-s": SEDI_SCHEMA_SAID,
      },
    });

    if (!credentials || credentials.length === 0) {
      res.status(404).json({ success: false, data: null });
      return;
    }

    const cred = credentials[0];
    const attrs = cred.sad?.a || {};

    res.status(200).json({
      success: true,
      data: {
        said: cred.sad?.d,
        schemaSaid: SEDI_SCHEMA_SAID,
        firstName: attrs.firstName,
        lastName: attrs.lastName,
        dateOfBirth: attrs.dateOfBirth,
        address: attrs.address,
        driversLicense: attrs.driversLicense,
        issuedDate: attrs.dt,
        status: cred.status?.et === "iss" ? "active" : "revoked",
      },
    });
  } catch (err: any) {
    console.error("[SEDI] Credential lookup error:", err);
    res.status(500).json({ success: false, error: err?.message || "Lookup failed" });
  }
}
