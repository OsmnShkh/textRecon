# textRecon

Recon is a simple SMS bot that checks a URL against Google's [Safe Browsing Lists](https://developers.google.com/safe-browsing/v4/lists) to identify malicious URLS. It also returns a screenshot of the final page.

## Getting Started

Recon is a single-file Lambda handler that uses Twilio to send and receive messages and Google Cloud's Safe Browsing Lists to check URLs. Serverless Framework is used to manage local development and deployment to AWS.

The [chrome-aws-lambda](https://www.npmjs.com/package/chrome-aws-lambda) layer is used with Puppeteer to take screenshots.

### To get started, you'll need

- A [Google Cloud](http://cloud.google.com/) account with the Safe Browsing API Enabled
- A [Twilio](https://twilio.com/) account. Free or non-verified accounts work as well.
- A [Serverless Framework](https://www.serverless.com/) account

Once you're all set up, get the API keys and your Twilio phone number and add them to serverless-example.yml as environment variables and rename the file to serverless.yml.

Follow Serverless Framework's documentation to get the endpoint live, then update your Twilio phone number to use this endpoint for incoming SMS messages.
