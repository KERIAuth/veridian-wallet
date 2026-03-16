import { NotificationRoute } from "../utils/utils.types";
import { ISSUER_NAME } from "../consts";
import { SignifyClient } from "signify-ts";
import { processAgreeExn } from "../apis/sedi.api";

export class PollingService {
  constructor(private client: SignifyClient) {}

  async start() {
    this.pollNotifications();
  }

  private async pollNotifications() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const notifications = await this.client.notifications().list();
      for (const notif of notifications.notes) {
        await this.processNotification(notif);
      }
      await new Promise((rs) => setTimeout(rs, 2000));
    }
  }

  private async processNotification(notif: any) {
    try {
      switch (notif.a.r) {
        case NotificationRoute.ExnIpexOffer: {
          // Credential server is acting as holder for QVI flow — auto-agree
          const msg = await this.client.exchanges().get(notif.a.d!);
          const [agree, sigs, end] = await this.client.ipex().agree({
            senderName: ISSUER_NAME,
            recipient: msg.exn.i,
            offerSaid: msg.exn.d,
          });
          await this.client.ipex().submitAgree(ISSUER_NAME, agree, sigs, end, [msg.exn.i]);
          break;
        }

        case NotificationRoute.ExnIpexAgree: {
          // Resident agreed to our offer — send the credential grant
          const msg = await this.client.exchanges().get(notif.a.d!);
          const senderAid = msg.exn.i;
          const offerSaid = msg.exn.p;   // SAID of the offer being agreed to
          const agreeSaid = msg.exn.d;   // SAID of this agree exn
          if (offerSaid && agreeSaid) {
            await processAgreeExn(this.client, senderAid, offerSaid, agreeSaid);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error(`[PollingService] Error processing notification ${notif.i}:`, err);
    }

    await this.client.notifications().delete(notif.i);
  }
}
