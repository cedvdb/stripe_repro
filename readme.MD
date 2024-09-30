

When stripe identity is used to upload identity documents in test mode, the documents are not linked to neither a customer or connected account.
Therefor when an identity verification succeeds (verified), we must manually add the documents to a stripe Person.

Unfortunately we cannot use the documents that were provided during the identity verification as is. T

This repository showcase the issue by providing a minimal reproduction scenario

## How to reproduce issue

  1. Add your secret key from stripe test mode dashboard in stripe_client.ts
  2. run `npm run test`
