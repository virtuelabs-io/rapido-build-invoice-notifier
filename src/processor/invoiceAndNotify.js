"use strict";
const chromium = require("chrome-aws-lambda");
var AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

AWS.config.update({ region: process.env.REGION });
const s3 = new AWS.S3();

module.exports.fun = async (event, context, callBack) => {
  console.log(event)
  const data = {
    title: " Pdf generation using puppeteer",
    text: " Handlebar is awesome!"
  }
  const executablePath = event.isOffline
    ? "./node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
    : await chromium.executablePath;
  const file = fs.readFileSync(path.resolve(__dirname, "template.hbs"), 'utf8')
  const template = handlebars.compile(file)
  const html = template(data)
  console.log(html)
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
      margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" }
    });

    const output_filename = 'pdf-demo.pdf';

    const cDate = new Date().toISOString().slice(0,10).replace(/-/g, "");
    console.log(cDate);
    console.log(process.env.INVOICE_BUCKET_NAME)
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
