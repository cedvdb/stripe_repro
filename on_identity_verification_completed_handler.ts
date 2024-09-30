import Stripe from 'stripe';
import { stripeClient } from './stripe_client';




export type IdVerificationEvent = Stripe.IdentityVerificationSessionProcessingEvent
  | Stripe.IdentityVerificationSessionRequiresInputEvent
  | Stripe.IdentityVerificationSessionVerifiedEvent
  | Stripe.IdentityVerificationSessionCanceledEvent;


export class OnIdentityVerificationCompleted {

  async handle(event: IdVerificationEvent): Promise<void> {
    const verificationSession = event.data.object;

    if (verificationSession.status == 'verified') {
      await this._addVerificationDocumentsToPerson(verificationSession);
    }
  }


  /**
   * Stripe does not automatically link an identity verification to a customer or a connect account.
   * We have to manually add the documents to the account when the verification is successful.
  */
  private async _addVerificationDocumentsToPerson(verificationSession: Stripe.Identity.VerificationSession) {

    const connectId = verificationSession.metadata.connectId;
    const personId = verificationSession.metadata.personId;
    const lastReport = verificationSession.last_verification_report;
    if (lastReport == null) {
      return;
    }
    const reportId = typeof lastReport === 'object' ? lastReport.id : lastReport;
    const report = await stripeClient.identity.verificationReports.retrieve(reportId);
    const [front, back] = report.document?.files || [];
    await stripeClient.accounts.updatePerson(connectId, personId, {
      verification: { document: { front, back } }
    });
  }
}