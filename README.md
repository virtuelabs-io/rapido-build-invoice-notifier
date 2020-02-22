# Order Invoice Notifier

Service responsible for all generating invoices and send out notifications

## API's Available

- **Processor(s)**
  - invoiceAndNotify

# Build and deploy 

Create the domain if it dosent exist. This is a one-off command which need to run

```sh
# To create
serverless create_domain --profile <profile name>
# To remove
serverless delete_domain --profile <profile name>
```

Deploy it on `AWS`

```sh
# To deploy
serverless deploy --stage staging --profile <profile name>
# To delete
serverless remove --stage staging --profile <profile name>
```

> **Note**: Runs on a SQS trigger
