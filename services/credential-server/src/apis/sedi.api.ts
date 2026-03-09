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
  utahId: string;
  documentFileName?: string;
  signature: string[];
  submittedAt: string;
  status: "pending" | "issued" | "rejected";
  credentialSaid?: string;
}

// In-memory store — sufficient for a demo; both resident and admin hit the same process.
const applications = new Map<string, SediApplication>();

// ─── POST /sedi/apply ───────────────────────────────────────────────────────

export async function sediApply(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { aid, firstName, lastName, dateOfBirth, address, utahId, documentFileName, signature } =
    req.body;

  if (!aid || !firstName || !lastName || !dateOfBirth || !address || !utahId) {
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
    utahId,
    documentFileName,
    signature: signature || [],
    submittedAt: new Date().toISOString(),
    status: "pending",
  };

  applications.set(id, application);
  console.log(`[SEDI] Application received: ${id} for AID ${aid.slice(0, 20)}...`);

  res.status(202).json({ success: true, data: { applicationId: id } });
}

// ─── GET /sedi/applications ─────────────────────────────────────────────────

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
    const keriRegistryRegk = await getRegistry(client, ISSUER_NAME);

    const issueParams = {
      ri: keriRegistryRegk,
      s: SEDI_SCHEMA_SAID,
      a: {
        i: application.aid,
        dt: new Date().toISOString(),
        firstName: application.firstName,
        lastName: application.lastName,
        dateOfBirth: application.dateOfBirth,
        address: application.address,
        utahId: application.utahId,
      },
    };

    const result = await client.credentials().issue(ISSUER_NAME, issueParams);
    const op = await waitAndGetDoneOp(client, result.op, OP_TIMEOUT);

    if (!op.done) {
      res.status(500).json({ success: false, error: "Credential issuance timed out" });
      return;
    }

    const credential = await client.credentials().get(result.acdc.ked.d);
    const credSaid = credential.sad.d;
    const datetime = new Date().toISOString().replace("Z", "000+00:00");

    // IPEX unsolicited grant to the holder
    const [grant, gsigs, gend] = await client.ipex().grant({
      senderName: ISSUER_NAME,
      recipient: application.aid,
      acdc: new Serder(credential.sad),
      anc: new Serder(credential.anc),
      iss: new Serder(credential.iss),
      ancAttachment: credential.ancatc?.[0],
      datetime,
    });
    await client.ipex().submitGrant(ISSUER_NAME, grant, gsigs, gend, [application.aid]);

    application.status = "issued";
    application.credentialSaid = credSaid;
    applications.set(id, application);

    console.log(`[SEDI] Credential issued and granted: ${credSaid} to AID ${application.aid.slice(0, 20)}...`);
    res.status(200).json({ success: true, data: { credentialSaid: credSaid } });
  } catch (err: any) {
    console.error("[SEDI] Issue error:", err);
    res.status(500).json({ success: false, error: err?.message || "Issuance failed" });
  }
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
    // Find credentials issued TO this AID (-a-i is the issuee field in the attributes block)
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
        utahId: attrs.utahId,
        issuedDate: attrs.dt,
        status: cred.status?.et === "iss" ? "active" : "revoked",
      },
    });
  } catch (err: any) {
    console.error("[SEDI] Credential lookup error:", err);
    res.status(500).json({ success: false, error: err?.message || "Lookup failed" });
  }
}
