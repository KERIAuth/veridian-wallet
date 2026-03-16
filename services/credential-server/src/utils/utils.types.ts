import { Dict } from "signify-ts";

export type BranFileContent = {
  bran: string;
  issuerBran: string;
};

export enum NotificationRoute {
  ExnIpexApply = "/exn/ipex/apply",
  ExnIpexOffer  = "/exn/ipex/offer",
  ExnIpexAgree  = "/exn/ipex/agree",
  ExnIpexGrant  = "/exn/ipex/grant",
}

export type Credential = {
  status: {
    s: string;
  };
  sad: Dict<any>;
  anc: Dict<any>;
  iss: Dict<any>;
  ancatc?: string[];
};

export type QviCredential = {
  sad: Dict<any>;
};

export type LeCredential = {
  sad: Dict<any>;
  anc: Dict<any>;
  iss: Dict<any>;
  ancAttachment: string;
};

export type ExchangeMsg = {
  exn: {
    d: string;   // SAID of this exn
    i: string;   // sender AID
    r?: string;  // route  e.g. /ipex/agree
    p?: string;  // prior SAID — the message this exn is responding to
    a?: Dict<any>;
  };
};
