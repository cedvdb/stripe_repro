import assert from 'node:assert';
import { describe, it } from 'node:test';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { OnIdentityVerificationCompleted } from './on_identity_verification_completed_handler';
import { stripeClient } from './stripe_client';


// integration test for identity verification

describe('UpdateStripeOnAccountUpdated', { timeout: 60000 }, () => {


  it('should update stripe account person with verification documents when the event is a verified event', async () => {
    const handler = new OnIdentityVerificationCompleted();
    const { verificationSession, connectId, personId } = await createVerificationSession();
    await verifyIdentityInBrowser(verificationSession.url || '');
    // generate the event that stripe will send via webhook
    const hookEvent = await generateVerifiedEvent(verificationSession.id);
    await handler.handle(hookEvent);

    const person = await stripeClient.accounts.retrievePerson(connectId, personId);
    assert.equal(person.verification?.status, 'verified');
  });

  // helpers
  async function createVerificationSession() {
    const customer = await stripeClient.customers.create({});
    const connectAccount = await stripeClient.accounts.create({});
    const person = await stripeClient.accounts.createPerson(connectAccount.id, {
      first_name: 'test',
      last_name: 'doe', // todo should we create customer
    });

    // create verification session
    const verificationSession = await stripeClient.identity.verificationSessions.create({
      metadata: { connectId: connectAccount.id, personId: person.id, customerId: customer.id },
      return_url: 'https://google.com',
      type: 'document',
      client_reference_id: person.id,
      options: {
        document: {
          require_live_capture: true,
          allowed_types: ['driving_license', 'id_card', 'passport'],
          require_id_number: false,
          require_matching_selfie: true,
        },
      },
    });

    return { verificationSession, connectId: connectAccount.id, personId: person.id };
  }


  /**
   * Generate the event that stripe will send via webhook,
   * for testing it is easier than setting up a webhook listener
   */
  async function generateVerifiedEvent(sessionId: string) {
    const event = {
      type: 'identity.verification_session.verified',
      data: {
        object: await stripeClient.identity.verificationSessions.retrieve(sessionId)
      }
    } as unknown as Stripe.IdentityVerificationSessionVerifiedEvent;
    return event;
  }

  async function verifyIdentityInBrowser(verificationUrl: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL.
    await page.goto(verificationUrl);
    await page.waitForNavigation({ waitUntil: 'networkidle0' })

    const successBtn = await page.$('a#testing-submit-autocomplete-button');
    if (!successBtn) {
      throw 'successBtn not found';
    }
    await successBtn.evaluate(successBtn => successBtn.click());
    await delay(2000);

    // await page.waitForNavigation()

    await page.close();
    await browser.close();
  }

  function delay(time: number) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time)
    });
  }

});