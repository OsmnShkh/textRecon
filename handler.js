import Messenger from "./messenger.js";
const axios = require("axios");
const chromium = require("chrome-aws-lambda");
import * as fileType from "file-type";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuid } from "uuid";
import * as AWS from "aws-sdk";
const mime = require("mime-types");

const s3 = new AWS.S3();
const s3Bucket = process.env.imageUploadBucket;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const googleAuthToken = process.env.GOOGLE_AUTH_TOKEN;
const googleEndpoint =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" +
  googleAuthToken;
const twilioClient = require("twilio")(twilioAccountSid, twilioAuthToken); // eslint-disable-line

exports.checkLink = async (event, context, callback) => {
  // Parse event object to get body
  console.log("body ", event.body);

  let eventBody = event.body;

  // Build object from body

  function queryStringToJSON(qs) {
    let pairs = qs.split("&");
    let result = {};
    pairs.forEach(function (p) {
      let pair = p.split("=");
      let key = pair[0];
      let value = decodeURIComponent(pair[1] || "");

      if (result[key]) {
        if (Object.prototype.toString.call(result[key]) === "[object Array]") {
          result[key].push(value);
        } else {
          result[key] = [result[key], value];
        }
      } else {
        result[key] = value;
      }
    });

    return JSON.parse(JSON.stringify(result));
  }

  let textObj = queryStringToJSON(eventBody);

  // Find link in email

  const textLink = textObj.Body.match(/\bhttps?:\/\/\S+/gi);

  // Start headless browser

  // Go to page and take screenshot

  try {
    const browser = await chromium.puppeteer.launch({
      executablePath: await chromium.executablePath,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(textLink[0]);
    console.log("Page URL from try block", page.url());

    const screenshot = await page.screenshot();

    await browser.close();

    const fileName = "file-name-" + uuid() + ".png";
    const key = `$(name).$(detectedExt)`;
    const path = ".png";

    const mimeType = mime.lookup(screenshot);
    console.log("mimetype ", mimeType);
    const s3Params = {
      Bucket: s3Bucket,
      ContentType: "image/png",
      ACL: "public-read",
      Key: fileName,
      Body: screenshot,
    };
    console.log("filename var ", fileName);
    const data = await s3.upload(s3Params).promise(); // this line
    console.log(
      `File uploaded successfully. ${data.Location} ${data.Location}`
    );

    textObj.mediaUrl = data.Location;
  } catch (error) {
    console.log("error in screenshot block ", error);
  }

  const checkLinkReq = {
    client: {
      clientId: "testing",
      clientVersion: "0.0.1",
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "MALICIOUS_BINARY",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: "" }],
    },
  };
  // add exception handler for if text message does not include a URL

  checkLinkReq.threatInfo.threatEntries[0].url = textLink[0];

  try {
    const res = await axios.post(googleEndpoint, checkLinkReq);

    if (res.data.matches) {
      const warnMessage =
        "WARNING: Google Safe Browsing has detected this URL as " +
        res.data.matches[0].threatType +
        ". We recommend that you DO NOT click this link.";

      textObj.Body = warnMessage;
      console.log("text is unsafe ", textObj);
    } else {
      textObj.Body =
        "Google has not marked this URL as malicious. However, that does not mean it's safe. Excercise caution when visiting any unknown URLs!";
      console.log("text is Safe ", textObj);
    }
  } catch (error) {
    console.log("An error occurred:", error);
  }

  const messenger = new Messenger(twilioClient);

  const response = {
    headers: { "Access-Control-Allow-Origin": "*" }, // CORS requirement
    statusCode: 200,
    body: {},
  };

  console.log("Text Object ", textObj);

  try {
    const message = await messenger.send(textObj);
    if (message) {
      console.log(`message ${message.body}`);
      response.body = JSON.stringify({
        message: "Text message successfully sent!",
        data: message,
      });
      return response;
    }
  } catch (error) {
    response.statusCode = error.status;
    response.body = JSON.stringify({
      message: error.message,
      error: error, // eslint-disable-line
    });
    throw error;
  }
};
