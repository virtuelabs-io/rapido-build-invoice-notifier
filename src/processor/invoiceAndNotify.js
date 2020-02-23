"use strict";
const chromium = require("chrome-aws-lambda");
var AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

AWS.config.update({ region: process.env.REGION });
const s3 = new AWS.S3();

module.exports.fun = async (event, context, callBack) => {
  console.log("Processing message: ", event["Records"][0]["messageId"])
  let body = JSON.parse(event["Records"][0]["body"])
  let orderDetails = body["results"][0]
  const data = {
    orderDetails: orderDetails,
    title: "Invoice",
    contact: process.env.SUPPORT,
    organization: process.env.ORGANIZATION,
    created_on: orderDetails[0]["created_on"].slice(0,19).replace(/T/g, " "),
    sendTo: body["metadata"]["guest"] ? orderDetails[0]["email"] : body["metadata"]["receiptEmail"],
    orderId: orderDetails[0]["id"],
    deliveryAddress: {
        full_name: orderDetails[0]["full_name"],
        addr_1: orderDetails[0]["addr_1"],
        addr_2: orderDetails[0]["addr_2"],
        city: orderDetails[0]["city"],
        county: orderDetails[0]["county"],
        country: orderDetails[0]["country"],
        postcode: orderDetails[0]["postcode"]
    },
    orderSummary: {
        order_price_total: orderDetails[0]["order_price_total"],
        vat: orderDetails[0]["vat"],
        order_price: orderDetails[0]["order_price"],
        delivery_cost: orderDetails[0]["delivery_cost"],
    },
    cc: process.env.CC
  }

  console.log("data", data)
  const executablePath = event.isOffline
    ? "./node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
    : await chromium.executablePath;
  const file = fs.readFileSync(path.resolve(__dirname, "template.hbs"), 'utf8')
  const template = handlebars.compile(file)
  const html = template(data)

  let browser = null;

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();

    page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1.5cm", right: "1cm", bottom: "1cm", left: "1cm" }
    });

    const output_filename = data["orderId"] + '.pdf';

    const cDate = data["created_on"].slice(0,10).replace(/-/g, "/");

    const s3Params = {
      Bucket: process.env.INVOICE_BUCKET_NAME,
      Key: `${cDate}/${output_filename}`,
      Body: pdf,
      ContentType: "application/pdf"
    };

    console.log("Writing file to S3")
    const s3PushStatus = await s3.putObject(s3Params).promise()

    console.log(s3PushStatus)

    context.succeed({
        "StatusCode": 200
    });

  } catch (error) {
    console.log("An Error Occured!")
    return context.fail(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
