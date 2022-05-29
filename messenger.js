"use strict";

class Messenger {
  constructor(client) {
    this.client = client;
  }

  send(event) {
    // use twilio SDK to send text message
    const sms = {
      to: event.From,
      body: event.Body || "Hi",
      from: event.To,
    };

    sms.mediaUrl = event.mediaUrl;

    return this.client.messages.create(sms);
  }
}

module.exports = Messenger;
