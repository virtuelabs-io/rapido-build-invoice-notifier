const util = require("util");
const lambda = require("../../src/processor/invoiceAndNotify");
const handler = util.promisify(lambda.fun);

describe(`Testing: InvoiceAndNotify`, () => {
    beforeEach(() => {
        process.env.REGION = "eu-west-2";
    });

    test(`The handler exists`, () => {
      expect(handler).toBeTruthy();
    });
});
